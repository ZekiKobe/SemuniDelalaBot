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

const CATEGORY_LABELS = {
  am: {
    electronics: 'ኤሌክትሮኒክስ',
    phones: 'ስልኮች',
    laptops: 'ላፕቶፖች',
    tablets: 'ታብሌቶች',
    accessories: 'ተጨማሪ ዕቃዎች',
    vehicles: 'ተሽከርካሪዎች',
    cars: 'መኪናዎች',
    motorcycles: 'ሞተር ሳይክሎች',
    trucks: 'ትራኮች',
    properties: 'ንብረቶች',
    houses: 'ቤቶች',
    apartments: 'አፓርታማዎች',
    land: 'መሬት',
    'commercial-buildings': 'የንግድ ሕንፃዎች',
    'home-living': 'የቤት እቃዎች',
    furniture: 'ፈርኒቸር',
    appliances: 'የቤት መሳሪያዎች',
    others: 'ሌሎች',
  },
  or: {
    electronics: 'Elektirooniksii',
    phones: 'Bilbiloota',
    laptops: 'Laaptooppii',
    tablets: 'Taableetota',
    accessories: 'Meeshaalee dabalataa',
    vehicles: 'Konkolaattota',
    cars: 'Konkolaataa',
    motorcycles: 'Mootora',
    trucks: 'Konkolaataa feumsaa',
    properties: 'Qabeenya',
    houses: 'Mana',
    apartments: 'Apaartimentii',
    land: 'Lafa',
    'commercial-buildings': 'Gamoo daldalaa',
    'home-living': 'Mana fi Jireenya',
    furniture: 'Meeshaa manaa',
    appliances: 'Meeshaalee elektirikaa manaa',
    others: 'Kan biroo',
  },
};

const productMessages = (messages, lang) => messages[lang]?.product || messages.en.product;
const categoryLabel = (category, lang) => CATEGORY_LABELS[lang]?.[category.slug] || category.name;

const REQUIREMENT_TITLE_PROMPTS = {
  product: {
    en: '📝 Step 1/5: Requirement Title\n\nPlease enter a title for what you want to buy.\nExample: "Looking for iPhone 13 Pro Max"',
    am: '📝 ደረጃ 1/5: የፍላጎት ርዕስ\n\nእባክዎ መግዛት የሚፈልጉትን ዕቃ ርዕስ ያስገቡ።\nለምሳሌ: "iPhone 13 Pro Max እፈልጋለሁ"',
    or: '📝 Tokko 1/5: Mata duree fedhii\n\nMaal bitachuu akka barbaaddu mata duree galchi.\nFakkeenya: "iPhone 13 Pro Max barbaada"',
  },
  property: {
    en: '📝 Step 1/5: Requirement Title\n\nPlease enter a title for your property requirement.\nExample: "Looking for 2-bedroom apartment in Bole"',
    am: '📝 ደረጃ 1/5: የፍላጎት ርዕስ\n\nእባክዎ የቤት/ንብረት ፍላጎትዎን ርዕስ ያስገቡ።\nለምሳሌ: "በቦሌ 2 መኝታ አፓርታማ እፈልጋለሁ"',
    or: '📝 Tokko 1/5: Mata duree fedhii\n\nFedhii mana/qabeenyaa keetiif mata duree galchi.\nFakkeenya: "Bole keessatti apartimentii kutaa ciisichaa 2 barbaada"',
  },
};

const requirementTitlePrompt = (messages, lang, requirement = {}) => {
  const promptType = requirement.listingType === 'buy' && requirement.categorySlug !== 'properties'
    ? 'product'
    : 'property';

  return REQUIREMENT_TITLE_PROMPTS[promptType][lang] ||
    REQUIREMENT_TITLE_PROMPTS[promptType].en ||
    messages[lang].requirementTitle;
};

module.exports = {
  async showCategorySelector(chatId, flow, lang, options = {}) {
    const msgs = productMessages(this.messages, lang);
    const categories = options.parentId
      ? await categoryRepository.findActiveChildren(options.parentId)
      : await categoryRepository.findActiveRoots();

    if (!categories.length) {
      this.bot.sendMessage(chatId, msgs.noCategories);
      return false;
    }

    const visibleCategories = options.rootSlug
      ? categories.filter((category) => category.slug === options.rootSlug)
      : categories;

    if (!visibleCategories.length) {
      this.bot.sendMessage(chatId, msgs.requiredCategoryMissing);
      return false;
    }

    const keyboard = {
      inline_keyboard: visibleCategories.map((category) => ([
        {
          text: categoryLabel(category, lang),
          callback_data: options.parentId
            ? `subcat_${flow}_${category._id}`
            : `cat_${flow}_${category._id}`,
        },
      ])),
    };

    if (options.allowSkip) {
      keyboard.inline_keyboard.push([{ text: msgs.skipSubcategory, callback_data: `subcat_${flow}_skip` }]);
    }

    this.bot.sendMessage(chatId, options.prompt || msgs.selectCategory, { reply_markup: keyboard });
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
        prompt: productMessages(this.messages, lang).selectSubcategory,
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
    const category = await categoryRepository.findById(categoryId).lean();

    if (flow === 'product') {
      data.product.categoryId = categoryId;
      data.product.subcategoryId = undefined;
      data.product.categorySlug = category?.slug;
      return;
    }

    if (flow === 'requirement') {
      data.requirement.categoryId = categoryId;
      data.requirement.subcategoryId = undefined;
      data.requirement.categorySlug = category?.slug;
      return;
    }

    data.categoryId = categoryId;
    data.subcategoryId = undefined;
    data.categorySlug = category?.slug;
  },

  async setSelectedSubcategory(chatId, flow, subcategoryId) {
    const data = this.tempPropertyData.get(chatId);
    if (!data) return;
    const subcategory = await categoryRepository.findById(subcategoryId).lean();

    if (flow === 'product') {
      data.product.subcategoryId = subcategoryId;
      data.product.subcategorySlug = subcategory?.slug;
      return;
    }

    if (flow === 'requirement') {
      data.requirement.subcategoryId = subcategoryId;
      data.requirement.subcategorySlug = subcategory?.slug;
      return;
    }

    data.subcategoryId = subcategoryId;
    data.subcategorySlug = subcategory?.slug;
  },

  async continueAfterCategorySelection(chatId, flow, lang) {
    const state = this.userStates.get(chatId);
    if (!state) return;

    if (flow === 'product') {
      state.step = 'product_title';
      this.userStates.set(chatId, state);
      this.bot.sendMessage(chatId, productMessages(this.messages, lang).stepTitle);
      return;
    }

    if (flow === 'requirement') {
      state.step = 'req_title';
      this.userStates.set(chatId, state);
      const data = this.tempPropertyData.get(chatId);
      this.bot.sendMessage(chatId, requirementTitlePrompt(this.messages, lang, data?.requirement));
      return;
    }

    if (flow === 'property') {
      state.step = 'title';
      this.userStates.set(chatId, state);
      this.bot.sendMessage(chatId, this.messages[lang].step1_title);
    }
  }
};
