// Telegram bot only (1GB VPS). Usage:
//   pm2 startOrReload ecosystem.bot.config.js --env production
const path = require('path');

const backendDir = __dirname;

module.exports = {
  apps: [
    {
      name: 'delala-bot',
      cwd: backendDir,
      script: 'start-bot.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'development',
        ENABLE_TELEGRAM_POLLING: 'true',
      },
      env_production: {
        NODE_ENV: 'production',
        ENABLE_TELEGRAM_POLLING: 'true',
      },
      error_file: './logs/pm2-bot-error.log',
      out_file: './logs/pm2-bot-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 5000,
    },
  ],
};
