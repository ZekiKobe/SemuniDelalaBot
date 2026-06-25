const BOT_LANG_MAP = { om: 'or', or: 'or', am: 'am', en: 'en' };
const DB_LANG_MAP = { or: 'om', om: 'om', am: 'am', en: 'en' };

const normalizeBotLang = (lang) => BOT_LANG_MAP[lang] || 'en';

const normalizeDbLang = (lang) => DB_LANG_MAP[lang] || 'en';

const getMessages = (messages, lang) => messages[normalizeBotLang(lang)] || messages.en;

module.exports = {
  normalizeBotLang,
  normalizeDbLang,
  getMessages,
};
