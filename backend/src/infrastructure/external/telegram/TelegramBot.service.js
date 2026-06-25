const TelegramBot = require('node-telegram-bot-api');
const config = require('../../../config');
const logger = require('../../../shared/logger/winston.logger');
const authRepository = require('../../database/repositories/Auth.repository');
const messages = require('./telegramMessages');
const { getMessages, normalizeBotLang, normalizeDbLang } = require('./langUtils');
const categoryHandlers = require('./handlers/categoryHandlers');
const productHandlers = require('./handlers/productHandlers');
const propertyHandlers = require('./handlers/propertyHandlers');
const requirementHandlers = require('./handlers/requirementHandlers');
const productPersistenceHandlers = require('./handlers/productPersistenceHandlers');
const adminHandlers = require('./handlers/adminHandlers');
const publishingHandlers = require('./handlers/publishingHandlers');

const DEFAULT_LANGUAGE = 'en';
const DEFAULT_CHANNEL_URL = 'https://t.me/semunidelala';
const DESTRUCTIVE_CALLBACKS = new Set([
  'submit_later',
  'approve_req_',
  'reject_req_',
  'approve_listing_',
  'reject_listing_',
  'approve_',
  'reject_',
]);

class TelegramBotService {
  constructor() {
    this.bot = null;
    this.initialized = false;
    this.userStates = new Map();
    this.tempPropertyData = new Map();
    this.userLanguages = new Map();
    this.onboardedChats = new Set();
    this.processingCallbacks = new Set();
    this.messages = messages;
  }

  init() {
    if (this.initialized) return;

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

  getMsgs(lang) {
    return getMessages(this.messages, lang);
  }

  async ensureUserContext(chatId, from) {
    if (this.userLanguages.has(chatId)) {
      return this.userLanguages.get(chatId);
    }

    const user = await authRepository.findByTelegramChatId(chatId);
    if (user?.preferredLanguage) {
      const botLang = normalizeBotLang(user.preferredLanguage);
      this.userLanguages.set(chatId, botLang);
      this.onboardedChats.add(chatId);
      return botLang;
    }

    return DEFAULT_LANGUAGE;
  }

  isUserOnboarded(chatId) {
    return this.onboardedChats.has(chatId);
  }

  markUserOnboarded(chatId) {
    this.onboardedChats.add(chatId);
  }

  async hasJoinedRequiredChannel(chatId) {
    if (!config.telegram.channelId) {
      return true;
    }

    try {
      const member = await this.bot.getChatMember(config.telegram.channelId, chatId);
      return ['creator', 'administrator', 'member'].includes(member?.status);
    } catch (error) {
      logger.warn('Failed to verify Telegram channel membership', {
        chatId,
        channelId: config.telegram.channelId,
        error: error.message,
      });
      return false;
    }
  }

  async persistUserLanguage(chatId, lang, from) {
    const dbLang = normalizeDbLang(lang);

    try {
      let user = await authRepository.findByTelegramChatId(chatId);
      if (user) {
        await authRepository.updateUser(user._id, { preferredLanguage: dbLang });
        return;
      }

      if (from?.username) {
        user = await authRepository.findByPhone(`tg_${chatId}`);
        if (user) {
          await authRepository.updateUser(user._id, {
            preferredLanguage: dbLang,
            telegramChatId: String(chatId),
            telegramUsername: from.username,
          });
        }
      }
    } catch (error) {
      logger.warn('Failed to persist Telegram user language', {
        chatId,
        error: error.message,
      });
    }
  }

  async withCallbackLock(callbackId, chatId, handler) {
    const lockKey = `${chatId}:${callbackId}`;
    if (this.processingCallbacks.has(lockKey)) {
      await this.bot.answerCallbackQuery(callbackId, {
        text: 'Please wait...',
        show_alert: false,
      }).catch(() => {});
      return;
    }

    this.processingCallbacks.add(lockKey);
    try {
      await handler();
    } finally {
      this.processingCallbacks.delete(lockKey);
    }
  }

  isDestructiveCallback(data) {
    if (DESTRUCTIVE_CALLBACKS.has(data)) return true;
    return [...DESTRUCTIVE_CALLBACKS].some(
      (prefix) => prefix.endsWith('_') && data.startsWith(prefix)
    );
  }

  setupCommandHandlers() {
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const lang = await this.ensureUserContext(chatId, msg.from);

      if (this.isUserOnboarded(chatId)) {
        await this.showReturningWelcome(chatId, lang);
        return;
      }

      await this.showLanguageSelection(chatId, lang, true);
    });

    this.bot.onText(/\/menu/, async (msg) => {
      const chatId = msg.chat.id;
      const lang = await this.ensureUserContext(chatId, msg.from);

      if (!this.userLanguages.has(chatId)) {
        await this.bot.sendMessage(chatId, this.getMsgs(lang).selectLanguageFirst);
        await this.showLanguageSelection(chatId, lang, true);
        return;
      }

      await this.showMainMenu(chatId, lang);
    });

    this.bot.onText(/\/help/, async (msg) => {
      const chatId = msg.chat.id;
      const lang = await this.ensureUserContext(chatId, msg.from);
      const msgs = this.getMsgs(lang);
      const appButton = this.getAppInlineButton(msgs.downloadAppButton);

      await this.bot.sendMessage(chatId, msgs.help, {
        ...(appButton && { reply_markup: { inline_keyboard: [[appButton]] } }),
      });
    });

    this.bot.onText(/\/post/, async (msg) => {
      const chatId = msg.chat.id;
      const lang = await this.ensureUserContext(chatId, msg.from);

      if (!this.userLanguages.has(chatId)) {
        await this.bot.sendMessage(chatId, this.getMsgs(lang).selectLanguageFirst);
        return;
      }

      if (this.isUserOnboarded(chatId)) {
        await this.showSellerListingMenu(chatId, lang);
        return;
      }

      await this.startPropertySubmission(chatId, msg.from, lang);
    });

    this.bot.onText(/\/cancel/, async (msg) => {
      const chatId = msg.chat.id;
      const lang = await this.ensureUserContext(chatId, msg.from);
      this.cancelSubmission(chatId, lang);

      if (this.isUserOnboarded(chatId)) {
        await this.showMainMenu(chatId, lang);
      }
    });

    this.bot.onText(/\/mylistings/, async (msg) => {
      const chatId = msg.chat.id;
      const lang = await this.ensureUserContext(chatId, msg.from);
      await this.showUserListings(chatId, msg.from, lang);
    });

    this.bot.on('callback_query', async (query) => {
      const chatId = query?.message?.chat?.id;
      const data = typeof query.data === 'string' ? query.data : '';
      const lang = this.userLanguages.get(chatId) || DEFAULT_LANGUAGE;

      if (!chatId) {
        logger.error('Telegram callback query missing chat id', { query });
        return;
      }

      const runCallback = async () => {
        if (data.startsWith('lang_')) {
          await this.bot.answerCallbackQuery(query.id);
          const selectedLang = data.replace('lang_', '');
          this.userLanguages.set(chatId, selectedLang);
          await this.persistUserLanguage(chatId, selectedLang, query.from);

          const state = this.userStates.get(chatId);
          if (state?.changingLanguage) {
            this.userStates.delete(chatId);
            await this.confirmLanguageChange(chatId, selectedLang);
            return;
          }

          const joinedChannel = await this.hasJoinedRequiredChannel(chatId);
          if (joinedChannel) {
            this.markUserOnboarded(chatId);
            await this.showPostLanguageOnboarding(chatId, selectedLang);
            return;
          }

          await this.showChannelJoinPrompt(chatId, selectedLang);
        } else if (data === 'continue_after_channel') {
          await this.bot.answerCallbackQuery(query.id);
          const joinedChannel = await this.hasJoinedRequiredChannel(chatId);
          if (!joinedChannel) {
            await this.bot.sendMessage(chatId, this.getMsgs(lang).channelJoinRequired, {
              parse_mode: 'Markdown',
            });
            await this.showChannelJoinPrompt(chatId, lang);
            return;
          }

          this.markUserOnboarded(chatId);
          await this.showPostLanguageOnboarding(chatId, lang);
        } else if (data === 'user_buyer' || data === 'user_seller') {
          await this.bot.answerCallbackQuery(query.id);
          const userType = data === 'user_buyer' ? 'buyer' : 'seller';

          this.userStates.set(chatId, { userType, lang });

          if (userType === 'seller') {
            await this.showSellerListingMenu(chatId, lang);
          } else {
            await this.showBuyerQuickActions(chatId, lang);
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
          const storedLang = this.userLanguages.get(chatId) || lang;
          this.startPropertySubmission(chatId, query.from, storedLang, listingType);
        } else if (data === 'req_rent' || data === 'req_buy') {
          await this.bot.answerCallbackQuery(query.id);
          const requirementType = data === 'req_rent' ? 'rent' : 'buy';
          const requirementData = this.tempPropertyData.get(chatId);
          const state = this.userStates.get(chatId);
          if (!requirementData || !state) return;

          requirementData.requirement.listingType = requirementType;
          state.step = 'req_title';
          this.tempPropertyData.set(chatId, requirementData);
          this.userStates.set(chatId, state);
          
          await this.bot.sendMessage(chatId, this.getMsgs(lang).requirementTitle, {
            reply_markup: this.getMainReplyKeyboard(lang),
          });
        } else if (data === 'post_requirement') {
          await this.bot.answerCallbackQuery(query.id);
          await this.startRequirementSubmission(chatId, lang);
        } else if (data === 'browse_properties' || data.startsWith('browse_page_')) {
          await this.bot.answerCallbackQuery(query.id);
          const page = data.startsWith('browse_page_')
            ? parseInt(data.replace('browse_page_', ''), 10) || 0
            : 0;
          await this.showBrowseProperties(chatId, lang, page);
        } else if (data === 'my_listings') {
          await this.bot.answerCallbackQuery(query.id);
          await this.showUserListings(chatId, query.from, lang);
        } else if (data === 'contact_support') {
          await this.bot.answerCallbackQuery(query.id);
          const msgs = this.getMsgs(lang);
          this.userStates.set(chatId, { step: 'support_message', lang });
          await this.bot.sendMessage(chatId, msgs.supportMessage, {
            reply_markup: this.getMainReplyKeyboard(lang),
          });
        } else if (data === 'search_location') {
          await this.bot.answerCallbackQuery(query.id);
          const msgs = this.getMsgs(lang);
          await this.bot.sendMessage(chatId, msgs.searchLocationPrompt, {
            parse_mode: 'Markdown',
            reply_markup: this.getMainReplyKeyboard(lang),
          });
          this.userStates.set(chatId, { step: 'search_location', lang });
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
                  messageId: propertyData.imageControlsMessageId,
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

          if (state?.submitting) return;
          if (!state || !propertyData) return;

          state.submitting = true;
          this.userStates.set(chatId, state);

          try {
            if (propertyData.marketplaceListing) {
              await this.submitProductToDatabase(chatId, propertyData, state, lang);
            } else if (propertyData.requirement) {
              if (propertyData.paymentProof) {
                await this.finalizeRequirementToDatabase(chatId, propertyData, lang);
              } else {
                await this.requestPaymentProof(chatId, false, lang);
              }
            } else {
              await this.submitPropertyToDatabase(chatId, propertyData, state, lang);
            }
          } finally {
            const latestState = this.userStates.get(chatId);
            if (latestState) {
              delete latestState.submitting;
              this.userStates.set(chatId, latestState);
            }
          }
        } else if (data === 'cancel_submission') {
          await this.bot.answerCallbackQuery(query.id);
          this.cancelSubmission(chatId, lang);
          if (this.isUserOnboarded(chatId)) {
            await this.showMainMenu(chatId, lang);
          }
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
      };

      if (this.isDestructiveCallback(data)) {
        await this.withCallbackLock(query.id, chatId, runCallback);
      } else {
        await runCallback();
      }
    });

    this.bot.on('message', async (msg) => {
      const chatId = msg.chat.id;

      if (config.env === 'development' && msg.text?.startsWith('/')) {
        logger.debug('Telegram chat ID', { chatId });
      }

      const lang = await this.ensureUserContext(chatId, msg.from);
      const state = this.userStates.get(chatId);

      if (msg.text && typeof msg.text === 'string' && !msg.text.startsWith('/')) {
        const mainKeyboardAction = this.getMainKeyboardAction(msg.text, lang);

        if (mainKeyboardAction) {
          await this.handleMainKeyboardAction(chatId, msg, mainKeyboardAction, lang);
          return;
        }

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
    const msgs = this.getMsgs(lang);

    return {
      keyboard: [
        [
          { text: msgs.browseProperties },
          { text: msgs.searchByLocation },
        ],
        [
          { text: msgs.postRequirement },
          { text: msgs.seller },
        ],
        [
          { text: msgs.myListingsButton },
          { text: msgs.supportButton },
        ],
        [
          { text: msgs.changeLanguageButton },
        ],
      ],
      resize_keyboard: true,
      is_persistent: true,
      one_time_keyboard: false,
    };
  }

  getMainKeyboardAction(text, lang) {
    const msgs = this.getMsgs(lang);
    const actions = new Map([
      [msgs.browseProperties, 'browse_properties'],
      [msgs.searchByLocation, 'search_location'],
      [msgs.postRequirement, 'post_requirement'],
      [msgs.seller, 'user_seller'],
      [msgs.myListingsButton, 'my_listings'],
      [msgs.supportButton, 'contact_support'],
      [msgs.changeLanguageButton, 'change_language'],
    ]);

    return actions.get(text.trim());
  }

  async handleMainKeyboardAction(chatId, msg, action, lang) {
    const msgs = this.getMsgs(lang);

    if (action === 'browse_properties') {
      this.userStates.delete(chatId);
      this.tempPropertyData.delete(chatId);
      await this.showBrowseProperties(chatId, lang, 0);
    } else if (action === 'search_location') {
      this.tempPropertyData.delete(chatId);
      this.userStates.set(chatId, { step: 'search_location', lang });
      await this.bot.sendMessage(chatId, msgs.searchLocationPrompt, {
        parse_mode: 'Markdown',
        reply_markup: this.getMainReplyKeyboard(lang),
      });
    } else if (action === 'post_requirement') {
      this.tempPropertyData.delete(chatId);
      await this.startRequirementSubmission(chatId, lang);
    } else if (action === 'user_seller') {
      this.userStates.set(chatId, { userType: 'seller', lang });
      await this.showSellerListingMenu(chatId, lang);
    } else if (action === 'my_listings') {
      this.userStates.delete(chatId);
      this.tempPropertyData.delete(chatId);
      await this.showUserListings(chatId, msg.from, lang);
    } else if (action === 'contact_support') {
      this.tempPropertyData.delete(chatId);
      this.userStates.set(chatId, { step: 'support_message', lang });
      await this.bot.sendMessage(chatId, msgs.supportMessage, {
        reply_markup: this.getMainReplyKeyboard(lang),
      });
    } else if (action === 'change_language') {
      this.userStates.set(chatId, { changingLanguage: true, lang });
      this.tempPropertyData.delete(chatId);
      await this.showLanguageSelection(chatId, lang, false);
    }
  }

  async handleSupportMessage(chatId, msg) {
    const lang = this.userLanguages.get(chatId) || DEFAULT_LANGUAGE;
    const msgs = this.getMsgs(lang);

    if (!config.telegram.adminChatId) {
      await this.bot.sendMessage(chatId, msgs.supportUnavailable, {
        reply_markup: this.getMainReplyKeyboard(lang),
      });
      this.userStates.delete(chatId);
      return;
    }

    const from = msg.from || {};
    const username = from.username ? `@${from.username}` : 'N/A';
    const name = [from.first_name, from.last_name].filter(Boolean).join(' ') || 'Telegram User';
    const supportText = [
      msgs.supportTicketHeader,
      `User: ${name}`,
      `Username: ${username}`,
      `Chat ID: ${chatId}`,
      '',
      msg.text,
    ].join('\n');

    await this.bot.sendMessage(config.telegram.adminChatId, supportText);
    this.userStates.delete(chatId);
    await this.bot.sendMessage(chatId, msgs.supportReceived, {
      reply_markup: this.getMainReplyKeyboard(lang),
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
    const msgs = this.getMsgs(lang);
    const keyboard = {
      inline_keyboard: [
        [{ text: msgs.joinChannelButton, url: this.getChannelUrl() }],
        [{ text: msgs.continueButton, callback_data: 'continue_after_channel' }],
      ],
    };

    await this.bot.sendMessage(chatId, msgs.joinChannelPrompt, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  }

  async showPostLanguageOnboarding(chatId, lang) {
    const msgs = this.getMsgs(lang);

    await this.bot.sendMessage(chatId, msgs.benefits, {
      parse_mode: 'Markdown',
      reply_markup: this.getMainReplyKeyboard(lang),
    });

    const keyboard = {
      inline_keyboard: [
        [
          { text: msgs.buyer, callback_data: 'user_buyer' },
          { text: msgs.seller, callback_data: 'user_seller' },
        ],
      ],
    };

    await this.bot.sendMessage(chatId, msgs.userTypeSelection, {
      reply_markup: keyboard,
    });
  }

  async showLanguageSelection(chatId, lang, isWelcome = false) {
    const msgs = this.getMsgs(lang);
    const keyboard = {
      inline_keyboard: [
        [
          { text: '🇪🇹 አማርኛ', callback_data: 'lang_am' },
          { text: '🇬🇧 English', callback_data: 'lang_en' },
          { text: '🇪🇹 Afaan Oromoo', callback_data: 'lang_or' },
        ],
      ],
    };

    // Send logo with welcome message for first-time users
    if (isWelcome) {
      const path = require('path');
      const logoPath = path.join(__dirname, '../../../assets/logo1.png');
      
      try {
        await this.bot.sendPhoto(chatId, logoPath, {
          caption: msgs.welcome,
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        });
      } catch (error) {
        // Fallback to text-only if logo fails
        logger.warn('Failed to send logo, falling back to text', { error: error.message });
        await this.bot.sendMessage(chatId, msgs.welcome, {
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        });
      }
    } else {
      await this.bot.sendMessage(chatId, msgs.selectLanguage, {
        reply_markup: keyboard,
      });
    }
  }

  async confirmLanguageChange(chatId, lang) {
    const msgs = this.getMsgs(lang);
    await this.bot.sendMessage(chatId, msgs.languageChanged, {
      reply_markup: this.getMainReplyKeyboard(lang),
    });
  }

  async showReturningWelcome(chatId, lang) {
    const msgs = this.getMsgs(lang);
    await this.bot.sendMessage(chatId, msgs.returningWelcome, {
      parse_mode: 'Markdown',
      reply_markup: this.getMainReplyKeyboard(lang),
    });
  }

  async showMainMenu(chatId, lang) {
    const msgs = this.getMsgs(lang);
    await this.bot.sendMessage(chatId, msgs.mainMenuTitle, {
      parse_mode: 'Markdown',
      reply_markup: this.getMainReplyKeyboard(lang),
    });
  }

  async showSellerListingMenu(chatId, lang) {
    const msgs = this.getMsgs(lang);
    const productMsgs = msgs.product || this.messages.en.product;
    const keyboard = {
      inline_keyboard: [
        [{ text: productMsgs.propertyOption, callback_data: 'post_property' }],
        [{ text: productMsgs.productOption, callback_data: 'post_product' }],
      ],
    };

    await this.bot.sendMessage(chatId, `${msgs.postSellerMenuPrompt}\n\n${productMsgs.chooseListingType}`, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  }

  async showBuyerQuickActions(chatId, lang) {
    const msgs = this.getMsgs(lang);
    await this.bot.sendMessage(chatId, msgs.mainMenuPrompt, {
      reply_markup: this.getMainReplyKeyboard(lang),
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
