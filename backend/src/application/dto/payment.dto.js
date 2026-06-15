const Joi = require('joi');
const { PaymentMethod } = require('../../domain/enums');

const createPaymentSchema = Joi.object({
  propertyId: Joi.string().required(),
  method: Joi.string().valid(...Object.values(PaymentMethod)).required(),
});

const submitPaymentSchema = Joi.object({
  transactionReference: Joi.string().min(3).max(100).required(),
});

module.exports = {
  createPaymentSchema,
  submitPaymentSchema,
};
