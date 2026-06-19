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

const productMessages = (messages, lang) => messages[lang]?.product || messages.en.product;

module.exports = {
  async startProductSubmission(chatId, user, lang) {
    const state = this.userStates.get(chatId) || {};
    this.userStates.set(chatId, {
      ...state,
      step: 'product_category',
      userId: user.id,
      username: user.username,
      firstName: user.first_name,
      lang,
    });
    this.tempPropertyData.set(chatId, {
      marketplaceListing: true,
      images: [],
      product: {
        listingType: ListingType.PRODUCT_SALE,
      },
    });

    await this.showCategorySelector(chatId, 'product', lang, {
      prompt: productMessages(this.messages, lang).selectCategory,
    });
  },

  async handleProductCategorySelection(chatId, categoryId, lang) {
    await this.handleCategorySelectionCallback(chatId, `cat_product_${categoryId}`, lang);
  },

  async handleProductSubcategorySelection(chatId, subcategoryId, lang) {
    await this.handleSubcategorySelectionCallback(chatId, `subcat_product_${subcategoryId}`, lang);
  },

  async handleProductConditionSelection(chatId, condition, lang) {
    const state = this.userStates.get(chatId);
    const data = this.tempPropertyData.get(chatId);
    if (!state || !data?.marketplaceListing) return;

    data.product.condition = condition;
    state.step = 'product_phone';
    this.userStates.set(chatId, state);
    this.bot.sendMessage(chatId, productMessages(this.messages, lang).stepPhone);
  },

  async handleProductSubmissionStep(chatId, text, user, lang) {
    const state = this.userStates.get(chatId);
    const data = this.tempPropertyData.get(chatId);
    if (!state || !data?.marketplaceListing) return;

    const product = data.product;
    const value = text.trim();
    const msgs = productMessages(this.messages, lang);

    switch (state.step) {
      case 'product_title':
        if (value.length < 5) {
          this.bot.sendMessage(chatId, this.messages[lang].titleTooShort);
          return;
        }
        product.title = value;
        state.step = 'product_description';
        this.userStates.set(chatId, state);
        this.bot.sendMessage(chatId, msgs.stepDescription);
        break;

      case 'product_description':
        if (value.length < 20) {
          this.bot.sendMessage(chatId, this.messages[lang].descriptionTooShort);
          return;
        }
        product.description = value;
        state.step = 'product_price';
        this.userStates.set(chatId, state);
        this.bot.sendMessage(chatId, msgs.stepPrice);
        break;

      case 'product_price': {
        const price = Number(value.replace(/,/g, ''));
        if (!Number.isFinite(price) || price < 1) {
          this.bot.sendMessage(chatId, this.messages[lang].invalidPrice);
          return;
        }
        product.price = price;
        state.step = 'product_location';
        this.userStates.set(chatId, state);
        this.bot.sendMessage(chatId, msgs.stepLocation);
        break;
      }

      case 'product_location': {
        const parts = value.split(',').map((part) => part.trim()).filter(Boolean);
        if (parts.length < 1) {
          this.bot.sendMessage(chatId, this.messages[lang].invalidLocation);
          return;
        }
        product.location = {
          city: parts[0],
          subCity: parts[1],
          region: parts[0],
        };
        state.step = 'product_brand';
        this.userStates.set(chatId, state);
        this.bot.sendMessage(chatId, msgs.stepBrand);
        break;
      }

      case 'product_brand':
        if (value !== '-') product.brand = value;
        state.step = 'product_model';
        this.userStates.set(chatId, state);
        this.bot.sendMessage(chatId, msgs.stepModel);
        break;

      case 'product_model':
        if (value !== '-') product.model = value;
        state.step = 'product_year';
        this.userStates.set(chatId, state);
        this.bot.sendMessage(chatId, msgs.stepYear);
        break;

      case 'product_year': {
        if (value !== '-') {
          const year = Number(value);
          if (!Number.isInteger(year) || year < 1900 || year > 2100) {
            this.bot.sendMessage(chatId, msgs.invalidYear);
            return;
          }
          product.year = year;
        }
        state.step = 'product_condition';
        this.userStates.set(chatId, state);
        const keyboard = {
          inline_keyboard: [
            [{ text: msgs.conditionNew, callback_data: `prodcond_${ProductCondition.NEW}` }],
            [{ text: msgs.conditionUsed, callback_data: `prodcond_${ProductCondition.USED}` }],
            [{ text: msgs.conditionRefurbished, callback_data: `prodcond_${ProductCondition.REFURBISHED}` }],
          ],
        };
        this.bot.sendMessage(chatId, msgs.selectCondition, { reply_markup: keyboard });
        break;
      }

      case 'product_phone': {
        const phone = value.replace(/\s/g, '');
        const phoneRegex = /^\+?[0-9]{10,15}$/;
        if (!phoneRegex.test(phone)) {
          this.bot.sendMessage(chatId, this.messages[lang].invalidPhone);
          return;
        }
        product.contactPhone = phone;
        state.step = 'images';
        this.userStates.set(chatId, state);
        const imageKeyboard = {
          inline_keyboard: [
            [{ text: this.messages[lang].doneImages, callback_data: 'images_done' }],
            [{ text: this.messages[lang].skipImages, callback_data: 'images_skip' }],
          ],
        };
        const imagePrompt = await this.bot.sendMessage(chatId, msgs.stepImages, { reply_markup: imageKeyboard });
        data.imagePromptMessageId = imagePrompt.message_id;
        break;
      }

      default:
        break;
    }
  }
};
