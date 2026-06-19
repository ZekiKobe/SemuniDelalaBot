require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  apiVersion: process.env.API_VERSION || 'v1',

  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/delala',
    dbName: process.env.MONGODB_DB_NAME || 'delala',
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5242880,
    maxImagesPerProperty: parseInt(process.env.MAX_IMAGES_PER_PROPERTY, 10) || 20,
    minImagesPerProperty: parseInt(process.env.MIN_IMAGES_PER_PROPERTY, 10) || 0,
  },

  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    channelId: process.env.TELEGRAM_CHANNEL_ID || '',
    channelUrl: process.env.TELEGRAM_CHANNEL_URL || '',
    adminChatId: process.env.TELEGRAM_ADMIN_CHAT_ID || '',
    botUsername: process.env.TELEGRAM_BOT_USERNAME || '',
  },

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
  },

  payment: {
    listingFeeEtb: parseInt(process.env.LISTING_FEE_ETB, 10) || 20,
    listingDurationDays: parseInt(process.env.LISTING_DURATION_DAYS, 10) || 90,
    telebirr: {
      accountNumber: process.env.TELEBIRR_ACCOUNT_NUMBER || '',
      accountName: process.env.TELEBIRR_ACCOUNT_NAME || '',
    },
    cbe: {
      accountNumber: process.env.CBE_ACCOUNT_NUMBER || '',
      accountName: process.env.CBE_ACCOUNT_NAME || '',
    },
  },

  app: {
    url: process.env.APP_URL || 'http://localhost:3000',
    apiUrl: process.env.API_URL || 'http://localhost:5000',
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
    authMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 5,
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || './logs',
  },
};

const requiredInProduction = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

if (config.env === 'production') {
  const missing = requiredInProduction.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

module.exports = config;
