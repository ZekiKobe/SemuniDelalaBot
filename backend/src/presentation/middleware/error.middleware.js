const AppError = require('../../shared/errors/AppError');
const logger = require('../../shared/logger/winston.logger');

const errorMiddleware = (err, req, res, _next) => {
  let error = err;

  if (!(error instanceof AppError)) {
    if (err.name === 'ValidationError') {
      const details = Object.values(err.errors).map((e) => e.message);
      error = new AppError('Validation failed', 400, 'VALIDATION_ERROR', details);
    } else if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'field';
      error = new AppError(`${field} already exists`, 409, 'VALIDATION_ERROR');
    } else if (err.name === 'CastError') {
      error = new AppError('Invalid ID format', 400, 'VALIDATION_ERROR');
    } else if (err.name === 'JsonWebTokenError') {
      error = new AppError('Invalid token', 401, 'AUTH_TOKEN_INVALID');
    } else if (err.name === 'TokenExpiredError') {
      error = new AppError('Token expired', 401, 'AUTH_TOKEN_EXPIRED');
    } else {
      error = new AppError(
        process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
        500,
        'INTERNAL_ERROR'
      );
    }
  }

  logger.error('Request error', {
    requestId: req.requestId,
    code: error.code,
    message: error.message,
    statusCode: error.statusCode,
    path: req.path,
    method: req.method,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });

  res.status(error.statusCode).json({
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.details || [],
    },
  });
};

module.exports = errorMiddleware;
