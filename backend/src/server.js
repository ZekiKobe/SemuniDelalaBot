const app = require('./app');
const config = require('./config');
const { connectDatabase } = require('./config/database');
const logger = require('./shared/logger/winston.logger');
const settingsService = require('./application/services/Settings.service');
const telegramService = require('./infrastructure/external/telegram/TelegramBot.service');
const fcmService = require('./infrastructure/external/firebase/Fcm.service');
const { startJobs } = require('./jobs');

const startServer = async () => {
  await connectDatabase();
  await settingsService.seedDefaults();
  if (config.telegram.enablePolling) {
    telegramService.init();
  }
  await fcmService.init();
  startJobs();

  const server = app.listen(config.port, () => {
    logger.info(`Delala API running on port ${config.port}`, {
      env: config.env,
      apiVersion: config.apiVersion,
    });
  });

  const shutdown = async (signal) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason: reason?.message || reason });
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error: error.message, stack: error.stack });
    process.exit(1);
  });
};

startServer();
