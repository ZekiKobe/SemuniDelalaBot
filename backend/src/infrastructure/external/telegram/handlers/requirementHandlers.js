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
const { formatListingMessage, formatRequirementMessage: formatSharedRequirementMessage } = require('../messageFormatter');
const {
  UserRole,
  PropertyStatus,
  ListingStatus,
  ListingType,
  ProductCondition,
  TelegramPostStatus,
  TelegramPostType,
} = require('../../../../domain/enums');

const normalizePreferredLanguage = (lang = 'en') => (lang === 'or' ? 'om' : lang);

module.exports = {
  getRequirementTypeLabel(listingType) {
    return listingType === 'buy' ? 'Looking to Buy' : 'Looking to Rent';
  },

  async startRequirementSubmission(chatId, lang) {
    this.userStates.set(chatId, {
      step: 'req_type',
      lang: lang
    });
    this.tempPropertyData.set(chatId, {
      requirement: {},
      images: []
    });

    const keyboard = {
      inline_keyboard: [
        [
          { text: this.messages[lang].requirementRent, callback_data: 'req_rent' },
          { text: this.messages[lang].requirementBuy, callback_data: 'req_buy' }
        ]
      ]
    };

    this.bot.sendMessage(chatId, this.messages[lang].requirementListingType, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  },

  async handleRequirementSubmissionStep(chatId, text, lang) {
    const state = this.userStates.get(chatId);
    if (!state) return;

    const requirementData = this.tempPropertyData.get(chatId);
    const msgs = this.messages[lang];

    switch (state.step) {
      case 'req_title':
        if (text.length < 5) {
          this.bot.sendMessage(chatId, msgs.titleTooShort);
          return;
        }
        requirementData.requirement.title = text;
        state.step = 'req_description';
        this.userStates.set(chatId, state);
        this.bot.sendMessage(chatId, msgs.requirementDescription);
        break;

      case 'req_description':
        if (text.length < 20) {
          this.bot.sendMessage(chatId, msgs.descriptionTooShort);
          return;
        }
        requirementData.requirement.description = text;
        state.step = 'req_budget';
        this.userStates.set(chatId, state);
        this.bot.sendMessage(chatId, msgs.requirementBudget);
        break;

      case 'req_budget':
        const budget = parseInt(text);
        if (isNaN(budget) || budget < 100) {
          this.bot.sendMessage(chatId, msgs.invalidPrice);
          return;
        }
        requirementData.requirement.budget = budget;
        state.step = 'req_location';
        this.userStates.set(chatId, state);
        this.bot.sendMessage(chatId, msgs.requirementLocation);
        break;

      case 'req_location':
        if (text.length < 3) {
          this.bot.sendMessage(chatId, '❌ Location too short. Please enter a valid location.');
          return;
        }
        requirementData.requirement.location = text;
        state.step = 'req_contact';
        this.userStates.set(chatId, state);
        this.bot.sendMessage(chatId, msgs.requirementContact);
        break;

      case 'req_contact':
        const phoneRegex = /^\+?[0-9]{10,15}$/;
        if (!phoneRegex.test(text.replace(/\s/g, ''))) {
          this.bot.sendMessage(chatId, msgs.invalidPhone);
          return;
        }
        requirementData.requirement.contactPhone = text.replace(/\s/g, '');
        // Move to optional images step (match seller flow) before requesting payment
        state.step = 'images';
        this.userStates.set(chatId, state);

        const imageKeyboard = {
          inline_keyboard: [
            [{ text: msgs.doneImages, callback_data: 'images_done' }],
            [{ text: msgs.skipImages, callback_data: 'images_skip' }]
          ]
        };
        const imagePrompt = await this.bot.sendMessage(chatId, msgs.step8_images, { reply_markup: imageKeyboard });
        requirementData.imagePromptMessageId = imagePrompt.message_id;
        break;

      default:
        break;
    }
  },

  async submitRequirementToDatabase(chatId, data, lang) {
    try {
      // Create or get user from phone number
      let user = await authRepository.findByPhone(data.requirement.contactPhone);

      if (!user) {
        user = await authRepository.createUser({
          phoneNumber: data.requirement.contactPhone,
          fullName: 'Telegram User',
          telegramUsername: 'unknown',
          telegramChatId: String(chatId),
          preferredLanguage: normalizePreferredLanguage(lang),
          role: 'user',
          password: Math.random().toString(36).slice(-8),
        });
      }

      // Instead of immediate success, require payment proof similar to seller listings
      // Keep the requirement data in temp storage and prompt for payment proof
      const requirementId = `req_${Date.now()}`;

      // Store temp data for this requirement keyed by chatId
      this.tempPropertyData.set(chatId, {
        requirement: data.requirement,
        userId: user._id,
        requirementId,
        preferredLanguage: normalizePreferredLanguage(lang),
        images: data.images || [],
      });

      // Also store an admin-facing temp entry to allow admins to find the submission if needed
      this.tempPropertyData.set(`admin_${requirementId}`, {
        requirement: data.requirement,
        userId: user._id,
        chatId: chatId,
        preferredLanguage: normalizePreferredLanguage(lang),
      });

      // Set user state to expect payment proof
      const state = this.userStates.get(chatId) || {};
      state.step = 'paymentProof';
      this.userStates.set(chatId, state);

      // Send payment instructions and request proof
      const msgs = this.messages[lang];
      const instructions = `${msgs.paymentRequired}\n• Telebirr: ${config.payment.telebirr.accountNumber} (${config.payment.telebirr.accountName})\n• CBE: ${config.payment.cbe.accountNumber} (${config.payment.cbe.accountName})\n\n${msgs.afterPayment}`;

      this.bot.sendMessage(chatId, instructions);
      this.bot.sendMessage(chatId, msgs.step9_paymentProof);

      return;
    } catch (error) {
      logger.error('Failed to submit requirement', { error: error.message });
      this.bot.sendMessage(chatId, '❌ Failed to submit requirement. Please try again.');
      this.userStates.delete(chatId);
      this.tempPropertyData.delete(chatId);
    }
  },

  async showRequirementSummary(chatId, lang) {
    const state = this.userStates.get(chatId);
    if (!state) return;

    const data = this.tempPropertyData.get(chatId);
    if (!data || !data.requirement) return;

    const req = data.requirement;
    const msgs = this.messages[lang];

    const paymentStatus = data.paymentProof ? '✅ Uploaded' : '❌ Not uploaded';
    const paymentInstructions = data.paymentProof
      ? ''
      : `
${msgs.paymentRequired}
• Telebirr: ${config.payment.telebirr.accountNumber} (${config.payment.telebirr.accountName})
• CBE: ${config.payment.cbe.accountNumber} (${config.payment.cbe.accountName})
`;

    const typeLabel = this.getRequirementTypeLabel(req.listingType);
    const summary = `
${msgs.step10_summary}

📌 *Title:* ${req.title}
🛎️ *Need:* ${typeLabel}
📝 *Description:* ${req.description.substring(0, 100)}...
💰 *Budget:* ${req.budget} ETB
📍 *Location:* ${req.location}
📞 *Contact:* ${req.contactPhone}
💳 *Payment Proof:* ${paymentStatus}${paymentInstructions}
${data.paymentProof ? msgs.afterPaymentProof : msgs.afterPayment}

${msgs.downloadApp}
    `;

    const appButton = this.getAppInlineButton(msgs.downloadAppButton);
    const keyboard = {
      inline_keyboard: [
        ...(appButton ? [[appButton]] : []),
        ...(data.paymentProof ? [[
          { text: msgs.submit, callback_data: 'submit_later' },
          { text: msgs.cancel, callback_data: 'cancel_submission' }
        ]] : [[
          { text: msgs.cancel, callback_data: 'cancel_submission' }
        ]])
      ]
    };

    state.step = data.paymentProof ? 'readyToSubmit' : 'paymentProof';
    this.userStates.set(chatId, state);

    this.bot.sendMessage(chatId, summary, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  },

  async finalizeRequirementToDatabase(chatId, data, lang) {
    try {
      // Ensure user exists
      let user = await authRepository.findByPhone(data.requirement.contactPhone);
      if (!user) {
        user = await authRepository.createUser({
          phoneNumber: data.requirement.contactPhone,
          fullName: 'Telegram User',
          telegramUsername: 'unknown',
          telegramChatId: String(chatId),
          preferredLanguage: normalizePreferredLanguage(lang),
          role: 'user',
          password: Math.random().toString(36).slice(-8),
        });
      }

      // Persist requirement in DB with payment proof (if provided)
      let reqDoc = await requirementRepository.create({
        title: data.requirement.title,
        description: data.requirement.description,
        budget: data.requirement.budget,
        location: data.requirement.location,
        listingType: data.requirement.listingType || 'rent',
        categoryId: data.requirement.categoryId,
        subcategoryId: data.requirement.subcategoryId,
        contactPhone: data.requirement.contactPhone,
        createdBy: user._id,
        preferredLanguage: data.preferredLanguage || normalizePreferredLanguage(lang),
        status: data.paymentProof ? 'pending_approval' : 'pending_payment',
        paymentProof: data.paymentProof || undefined,
      });

      const images = await this.persistTelegramImages(
        reqDoc._id,
        data.images || [],
        'requirements'
      );
      if (images.length > 0) {
        reqDoc = await requirementRepository.update(reqDoc._id, { images });
      }

      // Clear temp state
      this.userStates.delete(chatId);
      this.tempPropertyData.delete(chatId);

      // Notify user of success
      this.bot.sendMessage(chatId, this.messages[lang].requirementSuccess);

      // Notify admin with approve/reject actions
      if (config.telegram.adminChatId) {
        const adminMessage = `💳 *New Requirement Payment Proof*\n\n*Title:* ${reqDoc.title}\n*Budget:* ${reqDoc.budget} ETB\n*Contact:* ${reqDoc.contactPhone}\n*Requirement ID:* ${reqDoc._id}\n\nReview and approve or reject:`;

        const keyboard = {
          inline_keyboard: [
            [
              { text: '✅ Approve', callback_data: `approve_req_${reqDoc._id}` },
              { text: '❌ Reject', callback_data: `reject_req_${reqDoc._id}` }
            ]
          ]
        };

        try {
          if (reqDoc.paymentProof && reqDoc.paymentProof.fileId) {
            await this.bot.sendPhoto(config.telegram.adminChatId, reqDoc.paymentProof.fileId, {
              caption: adminMessage,
              parse_mode: 'Markdown',
              reply_markup: keyboard
            });
          } else {
            await this.bot.sendMessage(config.telegram.adminChatId, adminMessage, { parse_mode: 'Markdown', reply_markup: keyboard });
          }
        } catch (err) {
          logger.error('Failed to send requirement payment proof to admin', { error: err.message });
        }
      }
    } catch (error) {
      logger.error('Failed to finalize requirement', { error: error.message });
      this.bot.sendMessage(chatId, '❌ Failed to finalize requirement. Please try again.');
    }
  },

  formatRequirementMessage(requirement, lang = requirement.preferredLanguage || requirement.createdBy?.preferredLanguage || 'en') {
    return formatSharedRequirementMessage(requirement, lang);
  }
};
