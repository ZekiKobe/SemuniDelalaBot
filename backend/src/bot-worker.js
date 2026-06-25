const { connectDatabase } = require('./config/database');
const logger = require('./shared/logger/winston.logger');
const settingsService = require('./application/services/Settings.service');
const telegramService = require('./infrastructure/external/telegram/TelegramBot.service');

const startBotWorker = async () => {
  await connectDatabase();
  await settingsService.seedDefaults();
  telegramService.init();
  logger.info('Delala Telegram bot worker started');
};

startBotWorker().catch((error) => {
  logger.error('Failed to start Telegram bot worker', { error: error.message });
  process.exit(1);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received — shutting down bot worker');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received — shutting down bot worker');
  process.exit(0);
});
