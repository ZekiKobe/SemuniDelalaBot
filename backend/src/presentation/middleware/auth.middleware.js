const jwt = require('jsonwebtoken');
const config = require('../../config');
const AppError = require('../../shared/errors/AppError');
const User = require('../../infrastructure/database/models/User.model');
const { UserStatus } = require('../../domain/enums');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401, 'AUTH_UNAUTHORIZED');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.accessSecret);

    const user = await User.findById(decoded.sub);
    if (!user) {
      throw new AppError('User not found', 401, 'AUTH_UNAUTHORIZED');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new AppError('Account suspended', 403, 'USER_SUSPENDED');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token expired', 401, 'AUTH_TOKEN_EXPIRED'));
    }
    return next(new AppError('Invalid token', 401, 'AUTH_TOKEN_INVALID'));
  }
};

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.accessSecret);
    const user = await User.findById(decoded.sub);
    if (user && user.status !== UserStatus.SUSPENDED) {
      req.user = user;
    }
  } catch {
    // Ignore invalid tokens for optional auth
  }
  next();
};

module.exports = { authenticate, optionalAuth };
