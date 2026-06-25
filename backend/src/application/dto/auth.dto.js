const Joi = require('joi');
const { isValidEthiopianPhone } = require('../../shared/utils/phoneValidator');
const { PreferredLanguage } = require('../../domain/enums');

const ethiopianPhone = Joi.string().custom((value, helpers) => {
  if (!isValidEthiopianPhone(value)) {
    return helpers.error('any.invalid');
  }
  return value;
}, 'Ethiopian phone validation').messages({ 'any.invalid': 'Invalid Ethiopian phone number' });

const registerSchema = Joi.object({
  fullName: Joi.string().min(2).max(100).required(),
  phoneNumber: ethiopianPhone.required(),
  email: Joi.string().email().optional().allow('', null),
  password: Joi.string().min(6).max(128).required(),
  preferredLanguage: Joi.string()
    .valid(...Object.values(PreferredLanguage))
    .optional(),
});

const loginSchema = Joi.object({
  identifier: Joi.string().required(),
  password: Joi.string().required(),
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

const forgotPasswordSchema = Joi.object({
  phoneNumber: ethiopianPhone.required(),
});

const resetPasswordSchema = Joi.object({
  phoneNumber: ethiopianPhone.required(),
  otp: Joi.string().length(6).required(),
  newPassword: Joi.string().min(6).max(128).required(),
});

const updateProfileSchema = Joi.object({
  fullName: Joi.string().min(2).max(100).optional(),
  email: Joi.string().email().optional().allow('', null),
  preferredLanguage: Joi.string()
    .valid(...Object.values(PreferredLanguage))
    .optional(),
});

const fcmTokenSchema = Joi.object({
  fcmToken: Joi.string().required(),
});

const telegramLoginSchema = Joi.object({
  id: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
  first_name: Joi.string().optional(),
  last_name: Joi.string().optional(),
  username: Joi.string().optional(),
  photo_url: Joi.string().uri().optional(),
  auth_date: Joi.number().required(),
  hash: Joi.string().required(),
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  fcmTokenSchema,
  telegramLoginSchema,
};
