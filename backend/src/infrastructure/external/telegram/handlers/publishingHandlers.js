const fs = require('fs').promises;
const https = require('https');
const path = require('path');
const { randomUUID } = require('crypto');
const config = require('../../../../config');
const logger = require('../../../../shared/logger/winston.logger');
const propertyService = require('../../../../application/services/Property.service');
const listingService = require('../../../../application/services/Listing.service');
const propertyRepository = require('../../../database/repositories/Property.repository');
const listingRepository = require('../../../database/repositories/Listing.repository');
const categoryRepository = require('../../../database/repositories/Category.repository');
const authRepository = require('../../../database/repositories/Auth.repository');
const requirementRepository = require('../../../database/repositories/Requirement.repository');
const TelegramPost = require('../../../database/models/TelegramPost.model');
const notificationService = require('../../../../application/services/Notification.service');
const channelPublisher = require('../channelPublisher');
const imageStorage = require('../telegramImageStorage');
const imageProcessor = require('../../../storage/ImageProcessor.service');
const { formatListingMessage, formatMarketplaceListingMessage, formatRequirementMessage } = require('../messageFormatter');
const {
  UserRole,
  PropertyStatus,
  ListingStatus,
  ListingType,
  ProductCondition,
  TelegramPostStatus,
  TelegramPostType,
} = require('../../../../domain/enums');

const { normalizeBotLang } = require('../langUtils');

module.exports = {
  async postListingToChannel(property, lang) {
    if (!this.isReady() || !config.telegram.channelId) {
      logger.warn('Telegram not configured — skipping channel post');
      return null;
    }

    let resolvedLang = lang;
    if (!resolvedLang && property?.createdBy) {
      const owner = typeof property.createdBy === 'object' && property.createdBy.preferredLanguage
        ? property.createdBy
        : await authRepository.findById(property.createdBy?._id || property.createdBy);
      resolvedLang = normalizeBotLang(owner?.preferredLanguage || 'en');
    }
    resolvedLang = normalizeBotLang(resolvedLang || 'en');

    const message = formatListingMessage(property, resolvedLang);
    const imagePaths = (property.images || [])
      .sort((a, b) => a.order - b.order)
      .map((img) => path.join(process.cwd(), img.url.replace(/^\//, '')))
      .filter(Boolean);

    try {
      let result;

      if (imagePaths.length > 0) {
        const mediaGroup = imagePaths.slice(0, 10).map((imgPath, index) => ({
          type: 'photo',
          media: imgPath,
          ...(index === 0 && { caption: message, parse_mode: 'HTML' }),
        }));

        result = await this.bot.sendMediaGroup(config.telegram.channelId, mediaGroup);

        if (imagePaths.length > 10) {
          const secondGroup = imagePaths.slice(10, 20).map((imgPath) => ({
            type: 'photo',
            media: imgPath,
          }));
          await this.bot.sendMediaGroup(config.telegram.channelId, secondGroup);
        }
      } else {
        result = await this.bot.sendMessage(config.telegram.channelId, message, {
          parse_mode: 'HTML',
        });
        result = [result];
      }

      const post = await TelegramPost.create({
        propertyId: property._id,
        channelId: config.telegram.channelId,
        messageId: result[0]?.message_id,
        postType: TelegramPostType.LISTING,
        status: TelegramPostStatus.SENT,
        content: message,
        imageMessageIds: result.map((r) => r.message_id),
        postedAt: new Date(),
      });

      logger.info('Property posted to Telegram', { propertyId: property._id });
      return post;
    } catch (error) {
      logger.error('Failed to post to Telegram', { error: error.message, propertyId: property._id });

      await TelegramPost.create({
        propertyId: property._id,
        channelId: config.telegram.channelId,
        postType: TelegramPostType.LISTING,
        status: TelegramPostStatus.FAILED,
        content: message,
        error: error.message,
      });

      throw error;
    }
  },

  async postMarketplaceListingToChannel(listing, lang = 'en') {
    if (!this.isReady() || !config.telegram.channelId) {
      logger.warn('Telegram not configured - skipping marketplace listing channel post');
      return null;
    }

    const message = formatMarketplaceListingMessage(listing, lang);
    const imagePaths = (listing.images || [])
      .sort((a, b) => a.order - b.order)
      .map((img) => path.join(process.cwd(), img.url.replace(/^\//, '')))
      .filter(Boolean);

    try {
      let result;

      if (imagePaths.length > 0) {
        const mediaGroup = imagePaths.slice(0, 10).map((imgPath, index) => ({
          type: 'photo',
          media: imgPath,
          ...(index === 0 && { caption: message, parse_mode: 'HTML' }),
        }));

        result = await this.bot.sendMediaGroup(config.telegram.channelId, mediaGroup);

        if (imagePaths.length > 10) {
          const secondGroup = imagePaths.slice(10, 20).map((imgPath) => ({
            type: 'photo',
            media: imgPath,
          }));
          await this.bot.sendMediaGroup(config.telegram.channelId, secondGroup);
        }
      } else {
        result = await this.bot.sendMessage(config.telegram.channelId, message, {
          parse_mode: 'HTML',
        });
        result = [result];
      }

      const post = await TelegramPost.create({
        listingId: listing._id,
        channelId: config.telegram.channelId,
        messageId: result[0]?.message_id,
        postType: TelegramPostType.LISTING,
        status: TelegramPostStatus.SENT,
        content: message,
        imageMessageIds: result.map((r) => r.message_id),
        postedAt: new Date(),
      });

      logger.info('Marketplace listing posted to Telegram', { listingId: listing._id });
      return post;
    } catch (error) {
      logger.error('Failed to post marketplace listing to Telegram', {
        error: error.message,
        listingId: listing._id,
      });

      await TelegramPost.create({
        listingId: listing._id,
        channelId: config.telegram.channelId,
        postType: TelegramPostType.LISTING,
        status: TelegramPostStatus.FAILED,
        content: message,
        error: error.message,
      });

      throw error;
    }
  },

  async persistTelegramPropertyImages(propertyId, telegramImages) {
    return this.persistTelegramImages(propertyId, telegramImages, 'properties');
  },

  async persistTelegramImages(entityId, telegramImages, folderName) {
    if (!Array.isArray(telegramImages) || telegramImages.length === 0) {
      return [];
    }

    const tempDir = path.join(config.upload.dir, 'temp');
    const outputDir = path.join(config.upload.dir, folderName, entityId.toString());
    const savedImages = [];

    for (const [index, image] of telegramImages.slice(0, config.upload.maxImagesPerProperty).entries()) {
      if (!image.filePath) continue;

      const tempFilename = `${randomUUID()}${path.extname(image.filePath) || '.jpg'}`;
      const tempPath = path.join(tempDir, tempFilename);

      try {
        await fs.mkdir(tempDir, { recursive: true });
        await this.downloadTelegramFile(image.filePath, tempPath);

        const processed = await imageProcessor.processImage(tempPath, outputDir, tempFilename);
        savedImages.push({
          url: `/uploads/${folderName}/${entityId}/${processed.mainFilename}`,
          thumbnailUrl: `/uploads/${folderName}/${entityId}/${processed.thumbFilename}`,
          order: index,
        });
      } catch (error) {
        logger.error('Failed to persist Telegram property image', {
          error: error.message,
          entityId,
          folderName,
          filePath: image.filePath,
        });
      } finally {
        await fs.unlink(tempPath).catch(() => {});
      }
    }

    return savedImages;
  },

  downloadTelegramFile(filePath, destinationPath) {
    const url = `https://api.telegram.org/file/bot${config.telegram.botToken}/${filePath}`;

    return new Promise((resolve, reject) => {
      const request = https.get(url, (response) => {
        if (response.statusCode !== 200) {
          response.resume();
          reject(new Error(`Telegram file download failed with status ${response.statusCode}`));
          return;
        }

        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', async () => {
          try {
            await fs.writeFile(destinationPath, Buffer.concat(chunks));
            resolve();
          } catch (error) {
            reject(error);
          }
        });
        response.on('error', reject);
      });

      request.on('error', reject);
      request.setTimeout(30000, () => {
        request.destroy(new Error('Telegram file download timed out'));
      });
    });
  },

  async postRequirementToChannel(requirement, lang = requirement.preferredLanguage || requirement.createdBy?.preferredLanguage || 'en') {
    if (!this.isReady() || !config.telegram.channelId) {
      logger.warn('Telegram not configured — skipping requirement channel post');
      return null;
    }

    const message = formatRequirementMessage(requirement, lang);
    const imagePaths = (requirement.images || [])
      .sort((a, b) => a.order - b.order)
      .map((img) => path.join(process.cwd(), img.url.replace(/^\//, '')))
      .filter(Boolean);

    try {
      let result;

      if (imagePaths.length > 0) {
        const mediaGroup = imagePaths.slice(0, 10).map((imgPath, index) => ({
          type: 'photo',
          media: imgPath,
          ...(index === 0 && { caption: message, parse_mode: 'HTML' }),
        }));

        result = await this.bot.sendMediaGroup(config.telegram.channelId, mediaGroup);

        if (imagePaths.length > 10) {
          const secondGroup = imagePaths.slice(10, 20).map((imgPath) => ({
            type: 'photo',
            media: imgPath,
          }));
          await this.bot.sendMediaGroup(config.telegram.channelId, secondGroup);
        }
      } else {
        result = await this.bot.sendMessage(config.telegram.channelId, message, {
          parse_mode: 'HTML',
        });
        result = [result];
      }

      const post = await TelegramPost.create({
        requirementId: requirement._id,
        channelId: config.telegram.channelId,
        messageId: result[0]?.message_id,
        postType: TelegramPostType.REQUIREMENT,
        status: TelegramPostStatus.SENT,
        content: message,
        imageMessageIds: result.map((r) => r.message_id),
        postedAt: new Date(),
      });

      logger.info('Requirement posted to Telegram', { requirementId: requirement._id });
      return post;
    } catch (error) {
      logger.error('Failed to post requirement to Telegram', { error: error.message, requirementId: requirement._id });

      await TelegramPost.create({
        requirementId: requirement._id,
        channelId: config.telegram.channelId,
        postType: TelegramPostType.REQUIREMENT,
        status: TelegramPostStatus.FAILED,
        content: message,
        error: error.message,
      });

      throw error;
    }
  },

  async notifyAdmin(text) {
    if (!this.isReady() || !config.telegram.adminChatId) return;

    try {
      await this.bot.sendMessage(config.telegram.adminChatId, text, { parse_mode: 'HTML' });
    } catch (error) {
      logger.error('Failed to send admin notification', { error: error.message });
    }
  },

  async notifyUser(telegramUsername, text) {
    if (!this.isReady() || !telegramUsername) return;

    try {
      let chatId = telegramUsername;
      // If numeric chat id provided, use it as-is
      if (/^\d+$/.test(String(telegramUsername))) {
        chatId = Number(telegramUsername);
      } else if (!String(telegramUsername).startsWith('@')) {
        chatId = `@${telegramUsername}`;
      }
      await this.bot.sendMessage(chatId, text);
    } catch (error) {
      logger.error('Failed to notify user via Telegram', { error: error.message });
    }
  }
};
