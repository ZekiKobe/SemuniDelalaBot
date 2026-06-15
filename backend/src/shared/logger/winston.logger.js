const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('../../config');

const logDir = config.logging.dir;
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

const transports = [
  new winston.transports.Console({
    format: config.env === 'production' ? jsonFormat : consoleFormat,
  }),
  new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
    format: jsonFormat,
    maxsize: 10485760,
    maxFiles: 10,
  }),
  new winston.transports.File({
    filename: path.join(logDir, 'combined.log'),
    format: jsonFormat,
    maxsize: 10485760,
    maxFiles: 10,
  }),
];

const logger = winston.createLogger({
  level: config.logging.level,
  defaultMeta: { service: 'delala-api' },
  transports,
  exitOnError: false,
});

module.exports = logger;
