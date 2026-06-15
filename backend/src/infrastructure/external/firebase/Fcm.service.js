const config = require('../../../config');
const logger = require('../../../shared/logger/winston.logger');

class FcmService {
  constructor() {
    this.admin = null;
    this.initialized = false;
  }

  async init() {
    if (!config.firebase.projectId || !config.firebase.privateKey) {
      logger.warn('Firebase not configured — push notifications disabled');
      return;
    }

    try {
      const admin = require('firebase-admin');
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: config.firebase.projectId,
            privateKey: config.firebase.privateKey,
            clientEmail: config.firebase.clientEmail,
          }),
        });
      }
      this.admin = admin;
      this.initialized = true;
      logger.info('Firebase FCM initialized');
    } catch (error) {
      logger.error('Failed to initialize Firebase', { error: error.message });
    }
  }

  isReady() {
    return this.initialized && this.admin;
  }

  async sendToTokens(tokens, notification, data = {}) {
    if (!this.isReady() || !tokens?.length) return { success: 0, failure: 0 };

    const validTokens = tokens.filter(Boolean);
    if (!validTokens.length) return { success: 0, failure: 0 };

    try {
      const response = await this.admin.messaging().sendEachForMulticast({
        tokens: validTokens,
        notification,
        data: Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v)])
        ),
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default' } } },
      });

      return {
        success: response.successCount,
        failure: response.failureCount,
      };
    } catch (error) {
      logger.error('FCM send failed', { error: error.message });
      return { success: 0, failure: validTokens.length };
    }
  }
}

module.exports = new FcmService();
