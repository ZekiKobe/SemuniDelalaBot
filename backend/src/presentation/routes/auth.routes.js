const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/Auth.controller');
const validate = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const asyncHandler = require('../../shared/utils/asyncHandler');
const config = require('../../config');
const {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  fcmTokenSchema,
} = require('../../application/dto/auth.dto');

const router = Router();

const authLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.authMax,
  message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many attempts' } },
});

router.post('/register', authLimiter, validate(registerSchema), asyncHandler(authController.register.bind(authController)));
router.post('/login', authLimiter, validate(loginSchema), asyncHandler(authController.login.bind(authController)));
router.post('/refresh', validate(refreshSchema), asyncHandler(authController.refresh.bind(authController)));
router.post('/logout', asyncHandler(authController.logout.bind(authController)));
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), asyncHandler(authController.forgotPassword.bind(authController)));
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), asyncHandler(authController.resetPassword.bind(authController)));

router.get('/me', authenticate, asyncHandler(authController.getMe.bind(authController)));
router.put('/me', authenticate, validate(updateProfileSchema), asyncHandler(authController.updateMe.bind(authController)));
router.put('/me/fcm-token', authenticate, validate(fcmTokenSchema), asyncHandler(authController.registerFcmToken.bind(authController)));

module.exports = router;
