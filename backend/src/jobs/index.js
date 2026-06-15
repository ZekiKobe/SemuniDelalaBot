const expireListingsJob = require('./expireListings.job');
const logger = require('../shared/logger/winston.logger');

const startJobs = () => {
  expireListingsJob.start();
  logger.info('Background jobs started');
};

module.exports = { startJobs };
