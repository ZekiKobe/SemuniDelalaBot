const AppError = require('../../shared/errors/AppError');

const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401, 'AUTH_UNAUTHORIZED'));
  }

  if (!allowedRoles.includes(req.user.role)) {
    return next(new AppError('Insufficient permissions', 403, 'AUTH_FORBIDDEN'));
  }

  next();
};

module.exports = authorize;
