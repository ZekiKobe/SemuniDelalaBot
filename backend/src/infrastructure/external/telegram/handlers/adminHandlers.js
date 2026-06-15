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

module.exports = {
  async handleAdminApproval(adminChatId, propertyId, approved) {
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
        // Update property status to approved
        await propertyRepository.update(propertyId, { 
          status: PropertyStatus.APPROVED,
          publishedAt: new Date()
        });

        // Post to channel
        try {
          await this.postListingToChannel(property);
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

      // Clear admin data
      this.tempPropertyData.delete(`admin_${propertyId}`);

    } catch (error) {
      logger.error('Failed to handle admin approval', { error: error.message });
      this.bot.sendMessage(adminChatId, '❌ Failed to process approval. Please try again.');
    }
  },

  async handleAdminMarketplaceListingApproval(adminChatId, listingId, approved) {
    try {
      const adminData = this.tempPropertyData.get(`admin_listing_${listingId}`);
      if (!adminData) {
        this.bot.sendMessage(adminChatId, 'Listing payment proof data not found. It may have expired.');
        return;
      }

      const listing = await listingRepository.findByIdRaw(listingId);
      if (!listing) {
        this.bot.sendMessage(adminChatId, 'Listing not found.');
        return;
      }

      if (approved) {
        await listingRepository.update(listingId, {
          status: ListingStatus.APPROVED,
          publishedAt: new Date(),
          rejectionReason: undefined,
        });

        this.bot.sendMessage(adminChatId, `Product listing approved (${listingId}).`);
        if (adminData.chatId) {
          this.bot.sendMessage(adminData.chatId, 'Your product listing payment was approved and your listing is now live.');
        }
      } else {
        await listingRepository.update(listingId, {
          status: ListingStatus.REJECTED,
          rejectionReason: 'Payment proof rejected by admin',
        });

        this.bot.sendMessage(adminChatId, `Product listing rejected (${listingId}).`);
        if (adminData.chatId) {
          this.bot.sendMessage(adminData.chatId, 'Your product listing payment proof was rejected. Please contact support or submit again.');
        }
      }

      this.tempPropertyData.delete(`admin_listing_${listingId}`);
    } catch (error) {
      logger.error('Failed to handle marketplace listing approval', { error: error.message, listingId });
      this.bot.sendMessage(adminChatId, 'Failed to process listing approval. Please try again.');
    }
  },

  async handleAdminRequirementApproval(adminChatId, requirementId, approved) {
    try {
      const req = await requirementRepository.findById(requirementId);
      if (!req) {
        this.bot.sendMessage(adminChatId, '❌ Requirement not found.');
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
    } catch (error) {
      logger.error('Failed to handle admin requirement approval', { error: error.message });
      this.bot.sendMessage(adminChatId, '❌ Failed to process requirement approval. Please try again.');
    }
  }
};
