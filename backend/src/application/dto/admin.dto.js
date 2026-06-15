const Joi = require('joi');
const { UserRole, UserStatus } = require('../../domain/enums');

const updateUserStatusSchema = Joi.object({
  status: Joi.string().valid(...Object.values(UserStatus)).required(),
});

const updateUserRoleSchema = Joi.object({
  role: Joi.string().valid(...Object.values(UserRole)).required(),
});

const rejectPropertySchema = Joi.object({
  rejectionReason: Joi.string().min(5).max(500).required(),
});

const rejectPaymentSchema = Joi.object({
  rejectionReason: Joi.string().min(5).max(500).required(),
  adminNotes: Joi.string().max(500).allow('', null),
});

const updateSettingsSchema = Joi.object({
  settings: Joi.array().items(
    Joi.object({
      key: Joi.string().required(),
      value: Joi.any().required(),
    })
  ).min(1).required(),
});

module.exports = {
  updateUserStatusSchema,
  updateUserRoleSchema,
  rejectPropertySchema,
  rejectPaymentSchema,
  updateSettingsSchema,
};
