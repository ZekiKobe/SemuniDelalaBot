const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const path = require('path');
const config = require('./config');
const routes = require('./presentation/routes');
const requestIdMiddleware = require('./presentation/middleware/requestId.middleware');
const errorMiddleware = require('./presentation/middleware/error.middleware');
const logger = require('./shared/logger/winston.logger');

const app = express();

app.set('trust proxy', 1);

app.use(requestIdMiddleware);
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
const corsOptions = {
  origin(origin, callback) {
    // Allow non-browser clients (curl, mobile) with no Origin header
    if (!origin) return callback(null, true);

    const allowed = config.app.corsOrigins;

    // In development, allow any localhost / 127.0.0.1 port (Flutter web uses random ports)
    if (config.env === 'development') {
      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      if (isLocalhost) return callback(null, true);
    }

    if (allowed.includes(origin)) return callback(null, true);

    callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(mongoSanitize());
app.use(xss());

app.use('/uploads', express.static(path.resolve(config.upload.dir)));

const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' } },
});
app.use('/api', limiter);

app.use(`/api/${config.apiVersion}`, routes);

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  });
});

app.use(errorMiddleware);

module.exports = app;
