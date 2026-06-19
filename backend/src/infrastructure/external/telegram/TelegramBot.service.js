const TelegramBot = require('node-telegram-bot-api');
const config = require('../../../config');
const logger = require('../../../shared/logger/winston.logger');
const messages = require('./telegramMessages');
const categoryHandlers = require('./handlers/categoryHandlers');
const productHandlers = require('./handlers/productHandlers');
const propertyHandlers = require('./handlers/propertyHandlers');
const requirementHandlers = require('./handlers/requirementHandlers');
const productPersistenceHandlers = require('./handlers/productPersistenceHandlers');
const adminHandlers = require('./handlers/adminHandlers');
const publishingHandlers = require('./handlers/publishingHandlers');

const DEFAULT_LANGUAGE = 'am';
const DEFAULT_CHANNEL_URL = 'https://t.me/semunidelala';

class TelegramBotService {
  constructor() {
    this.bot = null;
    this.initialized = false;
    this.userStates = new Map(); // Store conversation state per user
    this.tempPropertyData = new Map(); // Store temporary property data
    this.userLanguages = new Map(); // Store user language preference
    this.messages = messages;
  }

  init() {
    if (!config.telegram.botToken) {
      logger.warn('Telegram bot token not configured — Telegram features disabled');
      return;
    }

    try {
      this.bot = new TelegramBot(config.telegram.botToken, { polling: true });
      this.initialized = true;
      logger.info('Telegram bot initialized with polling');
      this.setupCommandHandlers();
    } catch (error) {
      logger.error('Failed to initialize Telegram bot', { error: error.message });
    }
  }

  setupCommandHandlers() {
    this.bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      const lang = this.userLanguages.get(chatId) || DEFAULT_LANGUAGE;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '🇪🇹 አማርኛ', callback_data: 'lang_am' },
            { text: '🇬🇧 English', callback_data: 'lang_en' },
            { text: '🇪🇹 Afaan Oromoo', callback_data: 'lang_or' }
          ]
        ]
      };

      this.bot.sendMessage(chatId, this.messages[lang].welcome, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    });

    this.bot.onText(/\/help/, (msg) => {
      const chatId = msg.chat.id;
      const lang = this.userLanguages.get(chatId) || DEFAULT_LANGUAGE;
      const appButton = this.getAppInlineButton(this.messages[lang].downloadAppButton);
      
      this.bot.sendMessage(chatId, this.messages[lang].help, { 
        ...(appButton && { reply_markup: { inline_keyboard: [[appButton]] } })
      });
    });

    this.bot.onText(/\/post/, (msg) => {
      const chatId = msg.chat.id;
      const lang = this.userLanguages.get(chatId) || DEFAULT_LANGUAGE;
      if (!this.userLanguages.has(chatId)) {
        this.bot.sendMessage(chatId, 'Please select a language first using /start');
        return;
      }
      this.startPropertySubmission(chatId, msg.from, lang);
    });

    this.bot.onText(/\/cancel/, (msg) => {
      const chatId = msg.chat.id;
      const lang = this.userLanguages.get(chatId) || DEFAULT_LANGUAGE;
      this.cancelSubmission(chatId, lang);
    });

    this.bot.onText(/\/mylistings/, async (msg) => {
      const chatId = msg.chat.id;
      const lang = this.userLanguages.get(chatId) || DEFAULT_LANGUAGE;
      await this.showUserListings(chatId, msg.from, lang);
    });

    // Handle callback queries
    this.bot.on('callback_query', async (query) => {
      const chatId = query?.message?.chat?.id;
      const data = typeof query.data === 'string' ? query.data : '';
      const lang = this.userLanguages.get(chatId) || DEFAULT_LANGUAGE;

      if (!chatId) {
        logger.error('Telegram callback query missing chat id', { query });
        return;
      }

      if (data.startsWith('lang_')) {
        await this.bot.answerCallbackQuery(query.id);
        const selectedLang = data.replace('lang_', '');
        this.userLanguages.set(chatId, selectedLang);

        await this.showChannelJoinPrompt(chatId, selectedLang);
      } else if (data === 'continue_after_channel') {
        await this.bot.answerCallbackQuery(query.id);
        await this.showPostLanguageOnboarding(chatId, lang);
      } else if (data === 'user_buyer' || data === 'user_seller') {
        await this.bot.answerCallbackQuery(query.id);
        const userType = data === 'user_buyer' ? 'buyer' : 'seller';

        this.userStates.set(chatId, {
          userType,
          lang
        });

        if (userType === 'seller') {
          const productMsgs = this.messages[lang].product || this.messages.en.product;
          const keyboard = {
            inline_keyboard: [
              [{ text: productMsgs.propertyOption, callback_data: 'post_property' }],
              [{ text: productMsgs.productOption, callback_data: 'post_product' }]
            ]
          };

          this.bot.sendMessage(chatId, `${productMsgs.postTitle}\n\n${productMsgs.chooseListingType}`, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
          });
        } else {
          const msgs = this.messages[lang] || this.messages[DEFAULT_LANGUAGE];
          const keyboard = {
            inline_keyboard: [
              [
                { text: msgs.postRequirement, callback_data: 'post_requirement' },
                { text: msgs.browseProperties, callback_data: 'browse_properties' }
              ],
              [
                { text: msgs.searchByLocation, callback_data: 'search_location' }
              ]
            ]
          };

          this.bot.sendMessage(chatId, msgs.buyerInlinePrompt, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
          });
        }
      } else if (data === 'post_property') {
        await this.bot.answerCallbackQuery(query.id);
        await this.startPropertySubmission(chatId, query.from, lang);
      } else if (data === 'post_product') {
        await this.bot.answerCallbackQuery(query.id);
        await this.startProductSubmission(chatId, query.from, lang);
      } else if (data.startsWith('cat_')) {
        await this.bot.answerCallbackQuery(query.id);
        await this.handleCategorySelectionCallback(chatId, data, lang);
      } else if (data.startsWith('subcat_')) {
        await this.bot.answerCallbackQuery(query.id);
        await this.handleSubcategorySelectionCallback(chatId, data, lang);
      } else if (data.startsWith('prodcat_')) {
        await this.bot.answerCallbackQuery(query.id);
        await this.handleProductCategorySelection(chatId, data.replace('prodcat_', ''), lang);
      } else if (data.startsWith('prodsub_')) {
        await this.bot.answerCallbackQuery(query.id);
        await this.handleProductSubcategorySelection(chatId, data.replace('prodsub_', ''), lang);
      } else if (data.startsWith('prodcond_')) {
        await this.bot.answerCallbackQuery(query.id);
        await this.handleProductConditionSelection(chatId, data.replace('prodcond_', ''), lang);
      } else if (data === 'start_rent' || data === 'start_buy') {
        await this.bot.answerCallbackQuery(query.id);
        const listingType = data === 'start_rent' ? 'rent' : 'buy';
        // Get the stored language preference
        const storedLang = this.userLanguages.get(chatId) || lang;
        this.startPropertySubmission(chatId, query.from, storedLang, listingType);
      } else if (data === 'req_rent' || data === 'req_buy') {
        await this.bot.answerCallbackQuery(query.id);
        const requirementType = data === 'req_rent' ? 'rent' : 'buy';
        const requirementData = this.tempPropertyData.get(chatId);
        const state = this.userStates.get(chatId);
        if (!requirementData || !state) return;

        requirementData.requirement.listingType = requirementType;
        state.step = 'req_category';
        this.tempPropertyData.set(chatId, requirementData);
        this.userStates.set(chatId, state);

        const categoryOptions = requirementType === 'rent'
          ? { rootSlug: 'properties', prompt: 'Select property type to rent:' }
          : { prompt: 'What property or product do you want to buy?' };
        const shown = await this.showCategorySelector(chatId, 'requirement', lang, categoryOptions);
        if (!shown) {
          state.step = 'req_title';
          this.userStates.set(chatId, state);
          this.bot.sendMessage(chatId, this.messages[lang].requirementTitle);
        }
      } else if (data === 'post_requirement') {
        await this.bot.answerCallbackQuery(query.id);
        await this.startRequirementSubmission(chatId, lang);
      } else if (data === 'browse_properties') {
        await this.bot.answerCallbackQuery(query.id);
        await this.showBrowseProperties(chatId, lang);
      } else if (data === 'my_listings') {
        await this.bot.answerCallbackQuery(query.id);
        await this.showUserListings(chatId, query.from, lang);
      } else if (data === 'contact_support') {
        await this.bot.answerCallbackQuery(query.id);
        const msgs = this.messages[lang] || this.messages[DEFAULT_LANGUAGE];
        this.userStates.set(chatId, { step: 'support_message', lang });
        await this.bot.sendMessage(chatId, msgs.supportMessage);
      } else if (data === 'search_location') {
        await this.bot.answerCallbackQuery(query.id);
        const msgs = this.messages[lang] || this.messages[DEFAULT_LANGUAGE];
        this.bot.sendMessage(chatId, msgs.searchLocationPrompt, {
          parse_mode: 'Markdown'
        });
        this.userStates.set(chatId, { step: 'search_location', lang: lang });
      } else if (data.startsWith('type_')) {
        await this.bot.answerCallbackQuery(query.id);
        this.handlePropertyTypeSelection(chatId, data.replace('type_', ''), lang);
      } else if (data === 'images_done' || data === 'images_skip') {
        await this.bot.answerCallbackQuery(query.id);
        const state = this.userStates.get(chatId);
        const propertyData = this.tempPropertyData.get(chatId);
        if (state && propertyData) {
          if (propertyData.imageControlsMessageId) {
            await this.bot.editMessageReplyMarkup(
              { inline_keyboard: [] },
              { chat_id: chatId, message_id: propertyData.imageControlsMessageId }
            ).catch((error) => {
              logger.debug('Failed to clear image controls after image step', {
                error: error.message,
                chatId,
                messageId: propertyData.imageControlsMessageId
              });
            });
            delete propertyData.imageControlsMessageId;
          }

          if (propertyData.marketplaceListing) {
            await this.requestPaymentProof(chatId, false, lang);
          } else if (propertyData.requirement) {
            await this.showRequirementSummary(chatId, lang);
          } else {
            await this.requestPaymentProof(chatId, false, lang);
          }
        }
      } else if (data === 'submit_later') {
        await this.bot.answerCallbackQuery(query.id);
        const state = this.userStates.get(chatId);
        const propertyData = this.tempPropertyData.get(chatId);
        if (state && propertyData) {
          if (propertyData.marketplaceListing) {
            await this.submitProductToDatabase(chatId, propertyData, state, lang);
          } else if (propertyData.requirement) {
            // If payment proof already uploaded, finalize requirement
            if (propertyData.paymentProof) {
              await this.finalizeRequirementToDatabase(chatId, propertyData, lang);
            } else {
              // Prompt for payment proof (user may have skipped images)
              await this.requestPaymentProof(chatId, false, lang);
            }
          } else {
            await this.submitPropertyToDatabase(chatId, propertyData, state, lang);
          }
        }
      } else if (data === 'cancel_submission') {
        await this.bot.answerCallbackQuery(query.id);
        this.cancelSubmission(chatId, lang);
      } else if (data.startsWith('approve_req_')) {
        await this.bot.answerCallbackQuery(query.id);
        const requirementId = data.replace('approve_req_', '');
        await this.handleAdminRequirementApproval(chatId, requirementId, true, query.message);
      } else if (data.startsWith('reject_req_')) {
        await this.bot.answerCallbackQuery(query.id);
        const requirementId = data.replace('reject_req_', '');
        await this.handleAdminRequirementApproval(chatId, requirementId, false, query.message);
      } else if (data.startsWith('approve_listing_')) {
        await this.bot.answerCallbackQuery(query.id);
        const listingId = data.replace('approve_listing_', '');
        await this.handleAdminMarketplaceListingApproval(chatId, listingId, true, query.message);
      } else if (data.startsWith('reject_listing_')) {
        await this.bot.answerCallbackQuery(query.id);
        const listingId = data.replace('reject_listing_', '');
        await this.handleAdminMarketplaceListingApproval(chatId, listingId, false, query.message);
      } else if (data.startsWith('approve_')) {
        await this.bot.answerCallbackQuery(query.id);
        const propertyId = data.replace('approve_', '');
        await this.handleAdminApproval(chatId, propertyId, true, query.message);
      } else if (data.startsWith('reject_')) {
        await this.bot.answerCallbackQuery(query.id);
        const propertyId = data.replace('reject_', '');
        await this.handleAdminApproval(chatId, propertyId, false, query.message);
      }

      this.bot.on('polling_error', (error) => {
        logger.error('Telegram polling error', { error: error.message });
      });
    });

    // Handle text messages for property submission
    this.bot.on('message', async (msg) => {
      const chatId = msg.chat.id;

      // Log chat ID for admin setup
      console.log('Chat ID:', chatId);

      const lang = this.userLanguages.get(chatId) || DEFAULT_LANGUAGE;
      const state = this.userStates.get(chatId);

      if (msg.text && typeof msg.text === 'string' && !msg.text.startsWith('/')) {
        const mainKeyboardAction = this.getMainKeyboardAction(msg.text, lang);

        if (mainKeyboardAction) {
          await this.handleMainKeyboardAction(chatId, msg, mainKeyboardAction, lang);
          return;
        }

        // Handle search location step
        if (state && state.step === 'support_message') {
          await this.handleSupportMessage(chatId, msg);
        } else if (state && state.step === 'search_location') {
          await this.handleLocationSearch(chatId, msg.text, lang);
        } else if (state && typeof state.step === 'string' && state.step.startsWith('product_')) {
          await this.handleProductSubmissionStep(chatId, msg.text, msg.from, lang);
        } else if (state && typeof state.step === 'string' && state.step.startsWith('req_')) {
          await this.handleRequirementSubmissionStep(chatId, msg.text, lang);
        } else {
          await this.handlePropertySubmissionStep(chatId, msg.text, msg.from, lang);
        }
      }

      // Handle photo uploads
      if (msg.photo) {
        await this.handlePhotoUpload(chatId, msg.photo, msg.from, lang);
      }
    });

    this.bot.on('polling_error', (error) => {
      logger.error('Telegram polling error', { error: error.message });
    });
  }

  isReady() {
    return this.initialized && this.bot;
  }

  getPublicAppUrl() {
    try {
      const url = new URL(config.app.url);
      const hostname = url.hostname.toLowerCase();
      const isHttp = url.protocol === 'https:' || url.protocol === 'http:';
      const isLocal = hostname === 'localhost'
        || hostname === '127.0.0.1'
        || hostname === '0.0.0.0'
        || hostname === '::1'
        || hostname.endsWith('.local');

      return isHttp && !isLocal ? url.toString() : null;
    } catch (error) {
      return null;
    }
  }

  getAppInlineButton(text) {
    const appUrl = this.getPublicAppUrl();
    return appUrl ? { text, url: appUrl } : null;
  }

  getMainReplyKeyboard(lang) {
    const msgs = this.messages[lang] || this.messages[DEFAULT_LANGUAGE];

    return {
      keyboard: [
        [
          { text: msgs.browseProperties },
          { text: msgs.searchByLocation }
        ],
        [
          { text: msgs.myListingsButton },
          { text: msgs.supportButton }
        ],
        [
          { text: msgs.changeLanguageButton }
        ]
      ],
      resize_keyboard: true,
      is_persistent: true,
      one_time_keyboard: false
    };
  }

  getMainKeyboardAction(text, lang) {
    const msgs = this.messages[lang] || this.messages[DEFAULT_LANGUAGE];
    const actions = new Map([
      [msgs.browseProperties, 'browse_properties'],
      [msgs.searchByLocation, 'search_location'],
      [msgs.myListingsButton, 'my_listings'],
      [msgs.supportButton, 'contact_support'],
      [msgs.changeLanguageButton, 'change_language']
    ]);

    return actions.get(text.trim());
  }

  async handleMainKeyboardAction(chatId, msg, action, lang) {
    const msgs = this.messages[lang] || this.messages[DEFAULT_LANGUAGE];

    if (action === 'browse_properties') {
      this.userStates.delete(chatId);
      this.tempPropertyData.delete(chatId);
      await this.showBrowseProperties(chatId, lang);
    } else if (action === 'search_location') {
      this.tempPropertyData.delete(chatId);
      this.userStates.set(chatId, { step: 'search_location', lang });
      await this.bot.sendMessage(chatId, msgs.searchLocationPrompt, {
        parse_mode: 'Markdown',
        reply_markup: this.getMainReplyKeyboard(lang)
      });
    } else if (action === 'my_listings') {
      this.userStates.delete(chatId);
      this.tempPropertyData.delete(chatId);
      await this.showUserListings(chatId, msg.from, lang);
    } else if (action === 'contact_support') {
      this.tempPropertyData.delete(chatId);
      this.userStates.set(chatId, { step: 'support_message', lang });
      await this.bot.sendMessage(chatId, msgs.supportMessage, {
        reply_markup: this.getMainReplyKeyboard(lang)
      });
    } else if (action === 'change_language') {
      this.userStates.delete(chatId);
      this.tempPropertyData.delete(chatId);
      await this.showLanguageSelection(chatId, lang);
    }
  }

  async handleSupportMessage(chatId, msg) {
    const lang = this.userLanguages.get(chatId) || DEFAULT_LANGUAGE;
    const msgs = this.messages[lang] || this.messages[DEFAULT_LANGUAGE];

    if (!config.telegram.adminChatId) {
      this.bot.sendMessage(chatId, msgs.supportUnavailable, {
        reply_markup: this.getMainReplyKeyboard(lang)
      });
      this.userStates.delete(chatId);
      return;
    }

    const from = msg.from || {};
    const username = from.username ? `@${from.username}` : 'N/A';
    const name = [from.first_name, from.last_name].filter(Boolean).join(' ') || 'Telegram User';
    const supportText = [
      'New Telegram support request',
      `User: ${name}`,
      `Username: ${username}`,
      `Chat ID: ${chatId}`,
      '',
      msg.text
    ].join('\n');

    await this.bot.sendMessage(config.telegram.adminChatId, supportText);
    this.userStates.delete(chatId);
    this.bot.sendMessage(chatId, msgs.supportReceived, {
      reply_markup: this.getMainReplyKeyboard(lang)
    });
  }

  getChannelUrl() {
    if (config.telegram.channelUrl) return config.telegram.channelUrl;
    if (config.telegram.channelId && config.telegram.channelId.startsWith('@')) {
      return `https://t.me/${config.telegram.channelId.replace(/^@/, '')}`;
    }

    return DEFAULT_CHANNEL_URL;
  }

  async showChannelJoinPrompt(chatId, lang) {
    const msgs = this.messages[lang] || this.messages[DEFAULT_LANGUAGE];
    const keyboard = {
      inline_keyboard: [
        [{ text: msgs.joinChannelButton, url: this.getChannelUrl() }],
        [{ text: msgs.continueButton, callback_data: 'continue_after_channel' }]
      ]
    };

    await this.bot.sendMessage(chatId, msgs.joinChannelPrompt, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  async showPostLanguageOnboarding(chatId, lang) {
    const msgs = this.messages[lang] || this.messages[DEFAULT_LANGUAGE];

    await this.bot.sendMessage(chatId, msgs.benefits, {
      parse_mode: 'Markdown',
      reply_markup: this.getMainReplyKeyboard(lang)
    });

    setTimeout(() => {
      const keyboard = {
        inline_keyboard: [
          [
            { text: msgs.buyer, callback_data: 'user_buyer' },
            { text: msgs.seller, callback_data: 'user_seller' }
          ]
        ]
      };

      this.bot.sendMessage(chatId, msgs.userTypeSelection, {
        reply_markup: keyboard
      });
    }, 500);
  }

  async showLanguageSelection(chatId, lang) {
    const msgs = this.messages[lang] || this.messages[DEFAULT_LANGUAGE];
    const keyboard = {
      inline_keyboard: [
        [
          { text: '🇪🇹 አማርኛ', callback_data: 'lang_am' },
          { text: '🇬🇧 English', callback_data: 'lang_en' },
          { text: '🇪🇹 Afaan Oromoo', callback_data: 'lang_or' }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, msgs.selectLanguage, {
      reply_markup: keyboard
    });
  }
}

Object.assign(
  TelegramBotService.prototype,
  categoryHandlers,
  productHandlers,
  propertyHandlers,
  requirementHandlers,
  productPersistenceHandlers,
  adminHandlers,
  publishingHandlers
);

module.exports = new TelegramBotService();
