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
const { formatListingMessage } = require('../messageFormatter');
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

// Helper to escape Markdown special characters
function escapeMarkdown(text) {
  if (!text) return text;
  return String(text).replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}
const productMessages = (messages, lang) => messages[normalizeBotLang(lang)]?.product || messages.en.product;

module.exports = {
  async showProductSummary(chatId, lang) {
    const state = this.userStates.get(chatId);
    const data = this.tempPropertyData.get(chatId);
    if (!state || !data?.marketplaceListing) return;

    const product = data.product;
    const msgs = productMessages(this.messages, lang);
    const imageCount = Array.isArray(data.images) ? data.images.length : 0;
    const summary = `
${msgs.summaryTitle}

${msgs.title}: ${product.title}
${msgs.description}: ${product.description.substring(0, 120)}${product.description.length > 120 ? '...' : ''}
${msgs.price}: ${product.price} ETB
${msgs.location}: ${product.location.city}${product.location.subCity ? `, ${product.location.subCity}` : ''}
${msgs.brand}: ${product.brand || msgs.notAvailable}
${msgs.model}: ${product.model || msgs.notAvailable}
${msgs.year}: ${product.year || msgs.notAvailable}
${msgs.condition}: ${product.condition}
${msgs.images}: ${imageCount} ${msgs.uploadedImages}
${msgs.paymentProof}: ${data.paymentProof ? msgs.uploaded : msgs.notUploaded}

${msgs.submitQuestion}
    `;

    const keyboard = {
      inline_keyboard: [
        ...(data.paymentProof ? [[
          { text: this.getMsgs(lang).submit, callback_data: 'submit_later' },
          { text: this.getMsgs(lang).cancel, callback_data: 'cancel_submission' },
        ]] : [[
          { text: this.getMsgs(lang).cancel, callback_data: 'cancel_submission' },
        ]]),
      ],
    };

    state.step = data.paymentProof ? 'product_ready_to_submit' : 'paymentProof';
    this.userStates.set(chatId, state);
    this.bot.sendMessage(chatId, summary, { reply_markup: keyboard });
  },

  async submitProductToDatabase(chatId, productData, state, lang) {
    try {
      if (!productData.paymentProof) {
        await this.requestPaymentProof(chatId, false, lang);
        return;
      }

      const product = productData.product;
      let user = await authRepository.findByPhone(product.contactPhone);

      if (!user) {
        user = await authRepository.createUser({
          phoneNumber: product.contactPhone,
          fullName: state.firstName || 'Telegram User',
          telegramUsername: state.username,
          telegramChatId: chatId.toString(),
          role: UserRole.USER,
          password: Math.random().toString(36).slice(-8),
        });
      }

      let listing = await listingService.create(user._id, {
        title: product.title,
        description: product.description,
        listingType: ListingType.PRODUCT_SALE,
        categoryId: product.categoryId,
        subcategoryId: product.subcategoryId,
        price: product.price,
        location: product.location,
        contactPhone: product.contactPhone,
        telegramUsername: state.username,
        status: ListingStatus.PENDING_APPROVAL,
        productDetails: {
          condition: product.condition,
          brand: product.brand,
          model: product.model,
          year: product.year,
        },
      });

      const images = await this.persistTelegramImages(listing._id, productData.images || [], 'listings');
      if (images.length > 0) {
        listing = await listingRepository.update(listing._id, { images });
      }

      this.tempPropertyData.set(`admin_listing_${listing._id}`, {
        listingId: listing._id,
        userId: user._id,
        paymentProof: productData.paymentProof,
        chatId: chatId,
        lang,
      });

      if (config.telegram.adminChatId) {
        const adminMessage = `
New marketplace product payment proof received

Title: ${escapeMarkdown(listing.title)}
Price: ${escapeMarkdown(listing.price)} ETB
Contact: ${escapeMarkdown(listing.contactPhone)}
Listing ID: ${listing._id}
        `;

        try {
          await this.bot.sendPhoto(config.telegram.adminChatId, productData.paymentProof.fileId, {
            caption: adminMessage,
            reply_markup: {
              inline_keyboard: [[
                { text: 'Approve', callback_data: `approve_listing_${listing._id}` },
                { text: 'Reject', callback_data: `reject_listing_${listing._id}` },
              ]],
            },
          });
        } catch (error) {
          logger.error('Failed to send product payment proof to admin', { error: error.message });
          await this.bot.sendMessage(config.telegram.adminChatId, adminMessage);
        }
      }

      this.userStates.delete(chatId);
      this.tempPropertyData.delete(chatId);
      this.bot.sendMessage(chatId, productMessages(this.messages, lang).submitted);
    } catch (error) {
      logger.error('Failed to submit product listing', { error: error.message });
      this.bot.sendMessage(chatId, productMessages(this.messages, lang).failedSubmit);
    }
  }
};
