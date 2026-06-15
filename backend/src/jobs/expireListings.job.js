const propertyRepository = require('../infrastructure/database/repositories/Property.repository');
const logger = require('../shared/logger/winston.logger');

const INTERVAL_MS = 60 * 60 * 1000; // 1 hour

const run = async () => {
  try {
    const result = await propertyRepository.expireListings(new Date());
    if (result.modifiedCount > 0) {
      logger.info('Expired listings updated', { count: result.modifiedCount });
    }
  } catch (error) {
    logger.error('Expire listings job failed', { error: error.message });
  }
};

const start = () => {
  run();
  setInterval(run, INTERVAL_MS);
};

module.exports = { start, run };
