const fs = require('fs').promises;
const https = require('https');
const path = require('path');
const { randomUUID } = require('crypto');
const config = require('../../../../config');
const logger = require('../../../../shared/logger/winston.logger');
const propertyService = require('../../../../application/services/Property.service');
const listingService = require('../../../../application/services/Listing.service');
const propertyRepository = require('../../../database/repositories/Property.repository');
const paymentRepository = require('../../../database/repositories/Payment.repository');
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
  PaymentStatus,
  ProductCondition,
  TelegramPostStatus,
  TelegramPostType,
} = require('../../../../domain/enums');

const productMessages = (messages, lang) => messages[lang]?.product || messages.en.product;

async function clearApprovalButtons(bot, fallbackChatId, message) {
  const chatId = message?.chat?.id || fallbackChatId;
  const messageId = message?.message_id;
  if (!chatId || !messageId) return;

  try {
    await bot.editMessageReplyMarkup(
      { inline_keyboard: [] },
      { chat_id: chatId, message_id: messageId }
    );
  } catch (error) {
    logger.debug('Failed to clear approval buttons', {
      error: error.message,
      chatId,
      messageId,
    });
  }
}

module.exports = {
  async handleAdminApproval(adminChatId, propertyId, approved, actionMessage) {
    try {
      const adminData = this.tempPropertyData.get(`admin_${propertyId}`);
      if (!adminData) {
        this.bot.sendMessage(adminChatId, '❌ Property data not found. It may have expired.');
        return;
      }

      const property = await propertyRepository.findById(propertyId);
      if (!property) {
        this.bot.sendMessage(adminChatId, '❌ Property not found.');
        return;
      }

      if (approved) {
        const now = new Date();
        if (adminData.paymentId) {
          await paymentRepository.update(adminData.paymentId, {
            status: PaymentStatus.APPROVED,
            verifiedAt: now,
          });
        }

        // Update property status to approved
        await propertyRepository.update(propertyId, { 
          status: PropertyStatus.APPROVED,
          publishedAt: now
        });

        // Post to channel
        try {
          await this.postListingToChannel(property, adminData.lang);
          this.bot.sendMessage(adminChatId, `✅ Property approved and posted to channel.`);
          
          // Notify user
          if (adminData.chatId) {
            this.bot.sendMessage(adminData.chatId, '✅ Your property has been approved and posted to @semunidelala');
          }
        } catch (error) {
          logger.error('Failed to post to channel', { error: error.message });
          this.bot.sendMessage(adminChatId, '⚠️ Property approved but failed to post to channel.');
        }
      } else {
        if (adminData.paymentId) {
          await paymentRepository.update(adminData.paymentId, {
            status: PaymentStatus.REJECTED,
            rejectionReason: 'Payment proof rejected by admin',
            verifiedAt: new Date(),
          });
        }

        // Update property status to rejected
        await propertyRepository.update(propertyId, { 
          status: PropertyStatus.REJECTED,
          rejectionReason: 'Payment proof rejected by admin'
        });

        this.bot.sendMessage(adminChatId, '❌ Property rejected.');
        
        // Notify user
        if (adminData.chatId) {
          this.bot.sendMessage(adminData.chatId, '❌ Your payment proof was rejected. Please contact support or submit again.');
        }
      }

      await clearApprovalButtons(this.bot, adminChatId, actionMessage);

      // Clear admin data
      this.tempPropertyData.delete(`admin_${propertyId}`);

    } catch (error) {
      logger.error('Failed to handle admin approval', { error: error.message });
      this.bot.sendMessage(adminChatId, '❌ Failed to process approval. Please try again.');
    }
  },

  async handleAdminMarketplaceListingApproval(adminChatId, listingId, approved, actionMessage) {
    try {
      const adminData = this.tempPropertyData.get(`admin_listing_${listingId}`);
      const listing = await listingRepository.findByIdRaw(listingId);
      if (!listing) {
        this.bot.sendMessage(adminChatId, 'Listing not found.');
        return;
      }

      if ([ListingStatus.APPROVED, ListingStatus.REJECTED].includes(listing.status)) {
        await clearApprovalButtons(this.bot, adminChatId, actionMessage);
        this.bot.sendMessage(adminChatId, `Listing already ${listing.status} (${listingId}).`);
        return;
      }

      const seller = await authRepository.findById(listing.sellerId);
      const sellerChatId = adminData?.chatId || seller?.telegramChatId;
      const sellerLang = adminData?.lang || seller?.preferredLanguage;

      if (approved) {
        const updatedListing = await listingRepository.update(listingId, {
          status: ListingStatus.APPROVED,
          publishedAt: new Date(),
          rejectionReason: undefined,
        });

        let posted = null;
        try {
          posted = await this.postMarketplaceListingToChannel(updatedListing, sellerLang);
        } catch (error) {
          logger.error('Failed to post marketplace listing to channel', { error: error.message, listingId });
        }

        this.bot.sendMessage(
          adminChatId,
          posted
            ? `Product listing approved and posted to channel (${listingId}).`
            : `Product listing approved (${listingId}), but failed to post to channel.`
        );
        if (sellerChatId) {
          this.bot.sendMessage(sellerChatId, productMessages(this.messages, sellerLang).approved);
        }
      } else {
        await listingRepository.update(listingId, {
          status: ListingStatus.REJECTED,
          rejectionReason: 'Payment proof rejected by admin',
        });

        this.bot.sendMessage(adminChatId, `Product listing rejected (${listingId}).`);
        if (sellerChatId) {
          this.bot.sendMessage(sellerChatId, productMessages(this.messages, sellerLang).rejected);
        }
      }

      this.tempPropertyData.delete(`admin_listing_${listingId}`);
      await clearApprovalButtons(this.bot, adminChatId, actionMessage);
    } catch (error) {
      logger.error('Failed to handle marketplace listing approval', { error: error.message, listingId });
      this.bot.sendMessage(adminChatId, 'Failed to process listing approval. Please try again.');
    }
  },

  async handleAdminRequirementApproval(adminChatId, requirementId, approved, actionMessage) {
    try {
      const req = await requirementRepository.findById(requirementId);
      if (!req) {
        this.bot.sendMessage(adminChatId, '❌ Requirement not found.');
        return;
      }

      if ([PropertyStatus.APPROVED, PropertyStatus.REJECTED].includes(req.status)) {
        await clearApprovalButtons(this.bot, adminChatId, actionMessage);
        this.bot.sendMessage(adminChatId, `Requirement already ${req.status} (${requirementId}).`);
        return;
      }

      if (approved) {
        await requirementRepository.update(requirementId, {
          status: PropertyStatus.APPROVED,
          publishedAt: new Date()
        });

        const updatedReq = await requirementRepository.findById(requirementId);
        let posted = null;

        try {
          posted = await this.postRequirementToChannel(updatedReq);
        } catch (err) {
          logger.error('Failed to post requirement to channel', { error: err.message, requirementId });
        }

        this.bot.sendMessage(adminChatId, posted ? `✅ Requirement approved and posted to channel (${requirementId}).` : `✅ Requirement approved (${requirementId}), but failed to post to channel.`);

        try {
          await notificationService.createAndSend(req.createdBy, {
            type: 'listing_approved',
            title: 'Requirement Approved',
            body: `Your requirement "${req.title}" has been approved and will be posted to the channel.`,
            data: { requirementId: requirementId.toString() }
          });
        } catch (err) {
          logger.error('Failed to notify user about requirement approval', { error: err.message });
        }
      } else {
        await requirementRepository.update(requirementId, {
          status: PropertyStatus.REJECTED,
          rejectionReason: 'Payment proof rejected by admin'
        });

        this.bot.sendMessage(adminChatId, `❌ Requirement rejected (${requirementId}).`);

        try {
          await notificationService.createAndSend(req.createdBy, {
            type: 'payment_rejected',
            title: 'Requirement Payment Rejected',
            body: 'Your payment proof for the requirement was rejected. Please resubmit.',
            data: { requirementId: requirementId.toString() }
          });
        } catch (err) {
          logger.error('Failed to notify user about requirement rejection', { error: err.message });
        }
      }

      await clearApprovalButtons(this.bot, adminChatId, actionMessage);
    } catch (error) {
      logger.error('Failed to handle admin requirement approval', { error: error.message });
      this.bot.sendMessage(adminChatId, '❌ Failed to process requirement approval. Please try again.');
    }
  }
};
