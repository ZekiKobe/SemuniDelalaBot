const mongoose = require('mongoose');
const config = require('./index');
const logger = require('../shared/logger/winston.logger');

const connectDatabase = async () => {
  try {
    mongoose.set('strictQuery', true);

    await mongoose.connect(config.mongodb.uri, {
      dbName: config.mongodb.dbName,
      maxPoolSize: 20,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info('MongoDB connected successfully', { dbName: config.mongodb.dbName });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', { error: err.message });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });
  } catch (error) {
    logger.error('MongoDB connection failed', { error: error.message });
    process.exit(1);
  }
};

const disconnectDatabase = async () => {
  await mongoose.connection.close();
  logger.info('MongoDB disconnected gracefully');
};

module.exports = { connectDatabase, disconnectDatabase };
