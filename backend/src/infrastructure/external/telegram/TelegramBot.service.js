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
      const lang = this.userLanguages.get(chatId) || 'en';

      const keyboard = {
        inline_keyboard: [
          [
            { text: '🇬🇧 English', callback_data: 'lang_en' },
            { text: '🇪🇹 አማርኛ', callback_data: 'lang_am' },
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
      const lang = this.userLanguages.get(chatId) || 'en';
      
      const keyboard = {
        inline_keyboard: [
          [
            { text: this.messages[lang].downloadAppButton, url: 'https://your-app-url.com' }
          ]
        ]
      };
      
      this.bot.sendMessage(chatId, this.messages[lang].help, { 
        reply_markup: keyboard
      });
    });

    this.bot.onText(/\/post/, (msg) => {
      const chatId = msg.chat.id;
      const lang = this.userLanguages.get(chatId) || 'en';
      if (!this.userLanguages.has(chatId)) {
        this.bot.sendMessage(chatId, 'Please select a language first using /start');
        return;
      }
      this.startPropertySubmission(chatId, msg.from, lang);
    });

    this.bot.onText(/\/cancel/, (msg) => {
      const chatId = msg.chat.id;
      const lang = this.userLanguages.get(chatId) || 'en';
      this.cancelSubmission(chatId, lang);
    });

    this.bot.onText(/\/mylistings/, async (msg) => {
      const chatId = msg.chat.id;
      const lang = this.userLanguages.get(chatId) || 'en';
      await this.showUserListings(chatId, msg.from, lang);
    });

    // Handle callback queries
    this.bot.on('callback_query', async (query) => {
      const chatId = query?.message?.chat?.id;
      const data = typeof query.data === 'string' ? query.data : '';
      const lang = this.userLanguages.get(chatId) || 'en';

      if (!chatId) {
        logger.error('Telegram callback query missing chat id', { query });
        return;
      }

      if (data.startsWith('lang_')) {
        await this.bot.answerCallbackQuery(query.id);
        const selectedLang = data.replace('lang_', '');
        this.userLanguages.set(chatId, selectedLang);
        
        // Show benefits section after language selection
        this.bot.sendMessage(chatId, this.messages[selectedLang].benefits, {
          parse_mode: 'Markdown'
        });
        
        // Show user type selection after benefits
        setTimeout(() => {
          const keyboard = {
            inline_keyboard: [
              [
                { text: this.messages[selectedLang].buyer, callback_data: 'user_buyer' },
                { text: this.messages[selectedLang].seller, callback_data: 'user_seller' }
              ]
            ]
          };
          
          this.bot.sendMessage(chatId, this.messages[selectedLang].userTypeSelection, {
            reply_markup: keyboard
          });
        }, 500);
      } else if (data === 'user_buyer' || data === 'user_seller') {
        await this.bot.answerCallbackQuery(query.id);
        const userType = data === 'user_buyer' ? 'buyer' : 'seller';

        // Store user type
        this.userStates.set(chatId, {
          userType: userType,
          lang: lang
        });

        // For sellers: show listing type selection to start posting
        if (userType === 'seller') {
          const keyboard = {
            inline_keyboard: [
              [{ text: 'Property', callback_data: 'post_property' }],
              [{ text: 'Product for Sale', callback_data: 'post_product' }]
            ]
          };

          this.bot.sendMessage(chatId, `📝 *Post Your Property*\n\nWhat type of listing do you want to post?`, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
          });
        } else {
          // Buyer - show options to browse or post requirements
          const keyboard = {
            inline_keyboard: [
              [
                { text: this.messages[lang].postRequirement, callback_data: 'post_requirement' },
                { text: this.messages[lang].browseProperties, callback_data: 'browse_properties' }
              ],
              [
                { text: '� Search by Location', callback_data: 'search_location' }
              ]
            ]
          };

          this.bot.sendMessage(chatId, '🔍 *Find Your Perfect Property*\n\nChoose how you\'d like to proceed:', {
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
          : { prompt: 'What do you want to buy?' };
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
      } else if (data === 'search_location') {
        await this.bot.answerCallbackQuery(query.id);
        this.bot.sendMessage(chatId, '🔍 *Search by Location*\n\nPlease enter the city name to search for properties:\n\nExample: "Addis Ababa"', {
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
        await this.handleAdminRequirementApproval(chatId, requirementId, true);
      } else if (data.startsWith('reject_req_')) {
        await this.bot.answerCallbackQuery(query.id);
        const requirementId = data.replace('reject_req_', '');
        await this.handleAdminRequirementApproval(chatId, requirementId, false);
      } else if (data.startsWith('approve_listing_')) {
        await this.bot.answerCallbackQuery(query.id);
        const listingId = data.replace('approve_listing_', '');
        await this.handleAdminMarketplaceListingApproval(chatId, listingId, true);
      } else if (data.startsWith('reject_listing_')) {
        await this.bot.answerCallbackQuery(query.id);
        const listingId = data.replace('reject_listing_', '');
        await this.handleAdminMarketplaceListingApproval(chatId, listingId, false);
      } else if (data.startsWith('approve_')) {
        await this.bot.answerCallbackQuery(query.id);
        const propertyId = data.replace('approve_', '');
        await this.handleAdminApproval(chatId, propertyId, true);
      } else if (data.startsWith('reject_')) {
        await this.bot.answerCallbackQuery(query.id);
        const propertyId = data.replace('reject_', '');
        await this.handleAdminApproval(chatId, propertyId, false);
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

      const lang = this.userLanguages.get(chatId) || 'en';
      const state = this.userStates.get(chatId);

      if (msg.text && typeof msg.text === 'string' && !msg.text.startsWith('/')) {
        // Handle search location step
        if (state && state.step === 'search_location') {
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
