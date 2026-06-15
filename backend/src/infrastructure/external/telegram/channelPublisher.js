const path = require('path');
const config = require('../../../config');
const logger = require('../../../shared/logger/winston.logger');
const TelegramPost = require('../../database/models/TelegramPost.model');
const { TelegramPostStatus, TelegramPostType } = require('../../../domain/enums');
const { formatListingMessage, formatRequirementMessage } = require('./messageFormatter');

async function postListingToChannel(bot, property) {
  const message = formatListingMessage(property);
  const imagePaths = getImagePaths(property.images);

  try {
    const result = await sendMessageOrMediaGroup(bot, message, imagePaths);

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
}

async function postRequirementToChannel(bot, requirement) {
  const message = formatRequirementMessage(requirement);
  const imagePaths = getImagePaths(requirement.images);

  try {
    const result = await sendMessageOrMediaGroup(bot, message, imagePaths);

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
}

function getImagePaths(images = []) {
  return images
    .sort((a, b) => a.order - b.order)
    .map((img) => path.join(process.cwd(), img.url.replace(/^\//, '')))
    .filter(Boolean);
}

async function sendMessageOrMediaGroup(bot, message, imagePaths) {
  if (imagePaths.length === 0) {
    const result = await bot.sendMessage(config.telegram.channelId, message, {
      parse_mode: 'HTML',
    });
    return [result];
  }

  const mediaGroup = imagePaths.slice(0, 10).map((imgPath, index) => ({
    type: 'photo',
    media: imgPath,
    ...(index === 0 && { caption: message, parse_mode: 'HTML' }),
  }));

  const result = await bot.sendMediaGroup(config.telegram.channelId, mediaGroup);

  if (imagePaths.length > 10) {
    const secondGroup = imagePaths.slice(10, 20).map((imgPath) => ({
      type: 'photo',
      media: imgPath,
    }));
    await bot.sendMediaGroup(config.telegram.channelId, secondGroup);
  }

  return result;
}

module.exports = {
  postListingToChannel,
  postRequirementToChannel,
};
