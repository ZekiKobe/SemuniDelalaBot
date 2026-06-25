const https = require('https');
require('dotenv').config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

console.log('🧹 Clearing any previous webhook configuration...');

// Clear webhook to ensure polling works
const options = {
  hostname: 'api.telegram.org',
  path: `/bot${BOT_TOKEN}/deleteWebhook?drop_pending_updates=true`,
  method: 'POST'
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('✅ Webhook cleared');
    console.log('🚀 Starting bot worker...\n');
    require('./src/bot-worker');
  });
});

req.on('error', (error) => {
  console.warn('⚠️  Could not clear webhook:', error.message);
  console.log('🚀 Starting bot worker anyway...\n');
  require('./src/bot-worker');
});

req.end();
