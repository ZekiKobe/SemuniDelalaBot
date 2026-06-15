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
  async startPropertySubmission(chatId, user, lang, listingType = null) {
    const state = this.userStates.get(chatId) || {};
    this.userStates.set(chatId, {
      ...state,
      step: listingType ? 'category' : 'listingType',
      userId: user.id,
      username: user.username,
      firstName: user.first_name,
      lang: lang
    });
    this.tempPropertyData.set(chatId, {
      images: [],
      listingType: listingType
    });

    if (listingType) {
      const shown = await this.showCategorySelector(chatId, 'property', lang, {
        rootSlug: 'properties',
        prompt: 'Select property category:',
      });
      if (!shown) {
        const nextState = this.userStates.get(chatId);
        nextState.step = 'title';
        this.userStates.set(chatId, nextState);
        this.bot.sendMessage(chatId, this.messages[lang].step1_title);
      }
    } else {
      const keyboard = {
        inline_keyboard: [
          [
            { text: this.messages[lang].rent, callback_data: 'start_rent' },
            { text: this.messages[lang].buy, callback_data: 'start_buy' }
          ]
        ]
      };

      this.bot.sendMessage(chatId, this.messages[lang].step3_listingType, {
        reply_markup: keyboard
      });
    }
  },

  async handlePropertySubmissionStep(chatId, text, user, lang) {
    const state = this.userStates.get(chatId);
    if (!state) return;

    const propertyData = this.tempPropertyData.get(chatId);
    const msgs = this.messages[lang];

    switch (state.step) {
      case 'title':
        if (text.length < 5) {
          this.bot.sendMessage(chatId, msgs.titleTooShort);
          return;
        }
        propertyData.title = text;
        state.step = 'description';
        this.userStates.set(chatId, state);
        this.bot.sendMessage(chatId, msgs.step2_description);
        break;

      case 'description':
        if (text.length < 20) {
          this.bot.sendMessage(chatId, msgs.descriptionTooShort);
          return;
        }
        propertyData.description = text;
        state.step = 'propertyType';
        this.userStates.set(chatId, state);
        
        const typeKeyboard = {
          inline_keyboard: [
            [{ text: '🏢 Apartment', callback_data: 'type_apartment' }],
            [{ text: '🏠 Villa', callback_data: 'type_villa' }],
            [{ text: '🏘️ Condominium', callback_data: 'type_condominium' }],
            [{ text: '🏢 Studio', callback_data: 'type_studio' }],
            [{ text: '🏢 Office', callback_data: 'type_office' }],
            [{ text: '🏪 Shop', callback_data: 'type_shop' }]
          ]
        };
        this.bot.sendMessage(chatId, msgs.step4_propertyType, {
          reply_markup: typeKeyboard
        });
        break;

      case 'price':
        const price = parseInt(text);
        if (isNaN(price) || price < 100) {
          this.bot.sendMessage(chatId, msgs.invalidPrice);
          return;
        }
        propertyData.rentPrice = price;
        state.step = 'location';
        this.userStates.set(chatId, state);
        this.bot.sendMessage(chatId, msgs.step6_location);
        break;

      case 'location':
        const locationParts = text.split(',').map(p => p.trim());
        if (locationParts.length < 2) {
          this.bot.sendMessage(chatId, msgs.invalidLocation);
          return;
        }
        propertyData.city = locationParts[0];
        propertyData.subCity = locationParts[1];
        propertyData.region = locationParts[0];
        state.step = 'phone';
        this.userStates.set(chatId, state);
        this.bot.sendMessage(chatId, msgs.step7_phone);
        break;

      case 'phone':
        const phoneRegex = /^\+?[0-9]{10,15}$/;
        if (!phoneRegex.test(text.replace(/\s/g, ''))) {
          this.bot.sendMessage(chatId, msgs.invalidPhone);
          return;
        }
        propertyData.contactPhone = text.replace(/\s/g, '');
        state.step = 'images';
        this.userStates.set(chatId, state);
        
        const imageKeyboard = {
          inline_keyboard: [
            [{ text: msgs.doneImages, callback_data: 'images_done' }],
            [{ text: msgs.skipImages, callback_data: 'images_skip' }]
          ]
        };
        this.bot.sendMessage(chatId, msgs.step8_images, {
          reply_markup: imageKeyboard
        });
        break;

      default:
        break;
    }
  },

  async handlePhotoUpload(chatId, photos, user, lang) {
    const state = this.userStates.get(chatId);
    if (!state) return;

    const msgs = this.messages[lang];

    // Handle payment proof upload
    if (state.step === 'paymentProof') {
      try {
        const photo = photos[photos.length - 1];
        const fileId = photo.file_id;
        
        const file = await this.bot.getFile(fileId);
        const filePath = file.file_path;
        const downloadUrl = `https://api.telegram.org/file/bot${config.telegram.botToken}/${filePath}`;
        
        const propertyData = this.tempPropertyData.get(chatId);
        propertyData.paymentProof = {
          fileId,
          filePath,
          downloadUrl
        };

        // If this is a requirement submission, notify admin with the payment proof for review
        if (propertyData && propertyData.requirement && config.telegram.adminChatId) {
          const req = propertyData.requirement;
          const adminMessage = `💳 *New Requirement Payment Proof*\n\n*Title:* ${req.title}\n*Budget:* ${req.budget} ETB\n*Contact:* ${req.contactPhone}\n*From Telegram Chat:* ${chatId}\n\nPayment proof attached for review.`;
          try {
            await this.bot.sendPhoto(config.telegram.adminChatId, fileId, {
              caption: adminMessage,
              parse_mode: 'Markdown'
            });
          } catch (err) {
            logger.error('Failed to send requirement payment proof to admin', { error: err.message });
          }
        }

        state.step = 'summary';
        this.userStates.set(chatId, state);
        if (propertyData?.marketplaceListing) {
          await this.showProductSummary(chatId, lang);
        } else if (propertyData && propertyData.requirement) {
          await this.showRequirementSummary(chatId, lang);
        } else {
          await this.showPropertySummary(chatId, lang);
        }
      } catch (error) {
        logger.error('Failed to process payment proof', { error: error.message });
        this.bot.sendMessage(chatId, '❌ Failed to process payment proof. Please try again.');
      }
      return;
    }

    // Handle property images upload
    if (state.step !== 'images') return;

    const propertyData = this.tempPropertyData.get(chatId);
    if (!propertyData) {
      this.bot.sendMessage(chatId, msgs.failedSubmit || '❌ Unable to process image. Please restart the submission.');
      return;
    }
    if (!Array.isArray(propertyData.images)) {
      propertyData.images = [];
    }
    if (propertyData.images.length >= 10) {
      this.bot.sendMessage(chatId, msgs.maxImages);
      return;
    }

    try {
      const photo = photos[photos.length - 1];
      const fileId = photo.file_id;
      
      const file = await this.bot.getFile(fileId);
      const filePath = file.file_path;
      const downloadUrl = `https://api.telegram.org/file/bot${config.telegram.botToken}/${filePath}`;
      
      propertyData.images.push({
        fileId,
        filePath,
        downloadUrl
      });

      this.bot.sendMessage(chatId, `${msgs.imageUploaded} ${propertyData.images.length}/10`);

      if (propertyData.marketplaceListing || !propertyData.requirement) {
        await this.requestPaymentProof(chatId, false, lang);
      }
    } catch (error) {
      logger.error('Failed to process photo', { error: error.message });
      this.bot.sendMessage(chatId, '❌ Failed to process image. Please try again.');
    }
  },

  cancelSubmission(chatId, lang) {
    this.userStates.delete(chatId);
    this.tempPropertyData.delete(chatId);
    this.bot.sendMessage(chatId, this.messages[lang].submissionCancelled);
  },

  async showUserListings(chatId, user, lang) {
    try {
      this.bot.sendMessage(chatId, `
📋 *Your Listings*

To view your listings, please use our mobile app with the same phone number.
Or contact support with your Telegram username: @${user.username || 'N/A'}
      `, { parse_mode: 'Markdown' });
    } catch (error) {
      logger.error('Failed to show user listings', { error: error.message });
      this.bot.sendMessage(chatId, '❌ Failed to retrieve your listings.');
    }
  },

  async showBrowseProperties(chatId, lang) {
    try {
      // Fetch approved properties from the database
      const properties = await propertyRepository.findApproved({}, { createdAt: -1 }, 5);

      if (!properties || properties.length === 0) {
        this.bot.sendMessage(chatId, '🏠 No properties available at the moment. Please check back later.');
        return;
      }

      let message = '🏠 *Available Properties*\n\n';

      properties.forEach((property, index) => {
        message += `*${index + 1}. ${property.title}*\n`;
        message += `💰 ${property.rentPrice} ETB\n`;
        message += `📍 ${property.city}, ${property.subCity}\n`;
        message += `🏢 ${property.propertyType}\n\n`;
      });

      message += '📱 For more details and contact information, download our mobile app.';

      const keyboard = {
        inline_keyboard: [
          [
            { text: '📱 Download App', url: 'https://your-app-url.com' }
          ],
          [
            { text: '🔄 Refresh', callback_data: 'browse_properties' }
          ]
        ]
      };

      this.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    } catch (error) {
      logger.error('Failed to browse properties', { error: error.message });
      this.bot.sendMessage(chatId, '❌ Failed to load properties. Please try again later.');
    }
  },

  async handlePropertyTypeSelection(chatId, type, lang) {
    const state = this.userStates.get(chatId);
    if (!state) return;

    const propertyData = this.tempPropertyData.get(chatId);
    propertyData.propertyType = type;
    state.step = 'price';
    this.userStates.set(chatId, state);

    this.bot.sendMessage(chatId, this.messages[lang].step5_price);
  },

  async handleLocationSearch(chatId, location, lang) {
    try {
      // Search for properties by city using the search method
      const result = await propertyRepository.search(
        { city: location.toLowerCase(), status: 'approved' },
        { createdAt: -1 },
        0,
        5
      );

      if (!result || !result.data || result.data.length === 0) {
        this.bot.sendMessage(chatId, `🔍 No properties found in "${location}".\n\nTry searching for a different city or browse all properties.`);
        return;
      }

      let message = `🔍 *Properties in ${location}*\n\n`;

      result.data.forEach((property, index) => {
        message += `*${index + 1}. ${property.title}*\n`;
        message += `💰 ${property.rentPrice} ETB\n`;
        message += `📍 ${property.city}, ${property.subCity}\n`;
        message += `🏢 ${property.propertyType}\n\n`;
      });

      message += '📱 For more details and contact information, download our mobile app.';

      const keyboard = {
        inline_keyboard: [
          [
            { text: '📱 Download App', url: 'https://your-app-url.com' }
          ],
          [
            { text: '🔍 Search Again', callback_data: 'search_location' }
          ]
        ]
      };

      this.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

      // Clear search state
      this.userStates.delete(chatId);
    } catch (error) {
      logger.error('Failed to search by location', { error: error.message });
      this.bot.sendMessage(chatId, '❌ Failed to search properties. Please try again.');
    }
  },

  async requestPaymentProof(chatId, skipImages, lang) {
    const state = this.userStates.get(chatId);
    if (!state) return;

    state.step = 'paymentProof';
    this.userStates.set(chatId, state);

    const msgs = this.messages[lang];
    const instructions = `${msgs.paymentRequired}\n- Telebirr: ${config.payment.telebirr.accountNumber} (${config.payment.telebirr.accountName})\n- CBE: ${config.payment.cbe.accountNumber} (${config.payment.cbe.accountName})\n\n${msgs.afterPayment}`;

    this.bot.sendMessage(chatId, instructions);
    this.bot.sendMessage(chatId, msgs.step9_paymentProof);
  },

  async showPropertySummary(chatId, lang) {
    const state = this.userStates.get(chatId);
    if (!state) return;

    const propertyData = this.tempPropertyData.get(chatId);
    if (!propertyData) return;
    const msgs = this.messages[lang];

    const paymentStatus = propertyData.paymentProof ? '✅ Uploaded' : '❌ Not uploaded';
    const paymentInstructions = propertyData.paymentProof
      ? ''
      : `
${msgs.paymentRequired}
• Telebirr: ${config.payment.telebirr.accountNumber} (${config.payment.telebirr.accountName})
• CBE: ${config.payment.cbe.accountNumber} (${config.payment.cbe.accountName})
`;

    const summary = `
${msgs.step10_summary}

📌 *Title:* ${propertyData.title}
📝 *Description:* ${propertyData.description.substring(0, 100)}...
🏢 *Type:* ${propertyData.propertyType}
💰 *Price:* ${propertyData.rentPrice} ETB
📍 *Location:* ${propertyData.city}, ${propertyData.subCity}
📞 *Contact:* ${propertyData.contactPhone}
📷 *Images:* ${propertyData.images.length} uploaded
💳 *Payment Proof:* ${paymentStatus}${paymentInstructions}
${propertyData.paymentProof ? msgs.afterPaymentProof : msgs.afterPayment}

${msgs.downloadApp}
    `;

    const keyboard = {
      inline_keyboard: [
        [{ text: msgs.downloadAppButton, url: 'https://your-app-url.com' }],
        ...(propertyData.paymentProof ? [[
          { text: msgs.submit, callback_data: 'submit_later' },
          { text: msgs.cancel, callback_data: 'cancel_submission' }
        ]] : [[
          { text: msgs.cancel, callback_data: 'cancel_submission' }
        ]])
      ]
    };

    state.step = propertyData.paymentProof ? 'readyToSubmit' : 'paymentProof';
    this.userStates.set(chatId, state);

    this.bot.sendMessage(chatId, summary, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  },

  async submitPropertyToDatabase(chatId, propertyData, state, lang) {
    try {
      // Create or get user from phone number
      let user = await authRepository.findByPhone(propertyData.contactPhone);
      
      if (!user) {
        user = await authRepository.createUser({
          phoneNumber: propertyData.contactPhone,
          fullName: state.firstName || 'Telegram User',
          telegramUsername: state.username,
          role: UserRole.USER,
          password: Math.random().toString(36).slice(-8),
        });
      }

      // Create property with pending payment status
      let property = await propertyService.create(user._id, {
        title: propertyData.title,
        description: propertyData.description,
        propertyType: propertyData.propertyType,
        rentPrice: propertyData.rentPrice,
        city: propertyData.city,
        subCity: propertyData.subCity,
        region: propertyData.region,
        contactPhone: propertyData.contactPhone,
        bedrooms: 0,
        bathrooms: 0,
        status: propertyData.paymentProof ? PropertyStatus.PENDING_APPROVAL : PropertyStatus.DRAFT,
      });

      const images = await this.persistTelegramPropertyImages(property._id, propertyData.images || []);
      if (images.length > 0) {
        property = await propertyRepository.update(property._id, { images });
      }

      // Store payment proof for admin approval
      if (propertyData.paymentProof) {
        // Store property ID for admin approval
        this.tempPropertyData.set(`admin_${property._id}`, {
          propertyId: property._id,
          userId: user._id,
          paymentProof: propertyData.paymentProof,
          chatId: chatId
        });

        // Notify admin about new payment proof
        if (config.telegram.adminChatId) {
          const adminMessage = `
💳 *New Payment Proof Received*

*Property:* ${propertyData.title}
*Price:* ${propertyData.rentPrice} ETB
*Contact:* ${propertyData.contactPhone}
*User:* @${state.username || 'N/A'}
*Property ID:* ${property._id}

Payment proof is attached for review.
          `;
          
          const keyboard = {
            inline_keyboard: [
              [
                { text: '✅ Approve', callback_data: `approve_${property._id}` },
                { text: '❌ Reject', callback_data: `reject_${property._id}` }
              ]
            ]
          };
          
          try {
            await this.bot.sendPhoto(config.telegram.adminChatId, propertyData.paymentProof.fileId, {
              caption: adminMessage,
              parse_mode: 'Markdown',
              reply_markup: keyboard
            });
          } catch (error) {
            logger.error('Failed to send payment proof to admin', { error: error.message });
          }
        }
      }

      // Clear state
      this.userStates.delete(chatId);
      this.tempPropertyData.delete(chatId);

      this.bot.sendMessage(chatId, this.messages[lang].submitSuccess, { parse_mode: 'Markdown' });

    } catch (error) {
      logger.error('Failed to submit property', { error: error.message });
      this.bot.sendMessage(chatId, this.messages[lang].failedSubmit);
      this.cancelSubmission(chatId, lang);
    }
  }
};
