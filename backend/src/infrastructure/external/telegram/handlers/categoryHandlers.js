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
  async showCategorySelector(chatId, flow, lang, options = {}) {
    const categories = options.parentId
      ? await categoryRepository.findActiveChildren(options.parentId)
      : await categoryRepository.findActiveRoots();

    if (!categories.length) {
      this.bot.sendMessage(chatId, 'No categories are available yet. Please ask an admin to seed marketplace categories.');
      return false;
    }

    const visibleCategories = options.rootSlug
      ? categories.filter((category) => category.slug === options.rootSlug)
      : categories;

    if (!visibleCategories.length) {
      this.bot.sendMessage(chatId, 'The required category is not available yet. Please ask an admin to seed marketplace categories.');
      return false;
    }

    const keyboard = {
      inline_keyboard: visibleCategories.map((category) => ([
        {
          text: category.name,
          callback_data: options.parentId
            ? `subcat_${flow}_${category._id}`
            : `cat_${flow}_${category._id}`,
        },
      ])),
    };

    if (options.allowSkip) {
      keyboard.inline_keyboard.push([{ text: 'Skip subcategory', callback_data: `subcat_${flow}_skip` }]);
    }

    this.bot.sendMessage(chatId, options.prompt || 'Select category:', { reply_markup: keyboard });
    return true;
  },

  async handleCategorySelectionCallback(chatId, callbackData, lang) {
    const [, flow, categoryId] = callbackData.match(/^cat_([^_]+)_(.+)$/) || [];
    if (!flow || !categoryId) return;

    await this.setSelectedCategory(chatId, flow, categoryId);
    const children = await categoryRepository.findActiveChildren(categoryId);

    if (children.length > 0) {
      await this.showCategorySelector(chatId, flow, lang, {
        parentId: categoryId,
        allowSkip: true,
        prompt: 'Select subcategory:',
      });
      return;
    }

    await this.continueAfterCategorySelection(chatId, flow, lang);
  },

  async handleSubcategorySelectionCallback(chatId, callbackData, lang) {
    const [, flow, subcategoryId] = callbackData.match(/^subcat_([^_]+)_(.+)$/) || [];
    if (!flow || !subcategoryId) return;

    if (subcategoryId !== 'skip') {
      await this.setSelectedSubcategory(chatId, flow, subcategoryId);
    }

    await this.continueAfterCategorySelection(chatId, flow, lang);
  },

  async setSelectedCategory(chatId, flow, categoryId) {
    const data = this.tempPropertyData.get(chatId);
    if (!data) return;

    if (flow === 'product') {
      data.product.categoryId = categoryId;
      data.product.subcategoryId = undefined;
      return;
    }

    if (flow === 'requirement') {
      data.requirement.categoryId = categoryId;
      data.requirement.subcategoryId = undefined;
      return;
    }

    data.categoryId = categoryId;
    data.subcategoryId = undefined;
  },

  async setSelectedSubcategory(chatId, flow, subcategoryId) {
    const data = this.tempPropertyData.get(chatId);
    if (!data) return;

    if (flow === 'product') {
      data.product.subcategoryId = subcategoryId;
      return;
    }

    if (flow === 'requirement') {
      data.requirement.subcategoryId = subcategoryId;
      return;
    }

    data.subcategoryId = subcategoryId;
  },

  async continueAfterCategorySelection(chatId, flow, lang) {
    const state = this.userStates.get(chatId);
    if (!state) return;

    if (flow === 'product') {
      state.step = 'product_title';
      this.userStates.set(chatId, state);
      this.bot.sendMessage(chatId, 'Step 1/9: Product title\nExample: iPhone 13 Pro Max');
      return;
    }

    if (flow === 'requirement') {
      state.step = 'req_title';
      this.userStates.set(chatId, state);
      this.bot.sendMessage(chatId, this.messages[lang].requirementTitle);
      return;
    }

    if (flow === 'property') {
      state.step = 'title';
      this.userStates.set(chatId, state);
      this.bot.sendMessage(chatId, this.messages[lang].step1_title);
    }
  }
};
