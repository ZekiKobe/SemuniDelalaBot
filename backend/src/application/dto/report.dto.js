const Joi = require('joi');
const { ReportReason } = require('../../domain/enums');

const createReportSchema = Joi.object({
  propertyId: Joi.string().required(),
  reason: Joi.string().valid(...Object.values(ReportReason)).required(),
  description: Joi.string().max(1000).allow('', null),
});

const resolveReportSchema = Joi.object({
  status: Joi.string().valid('resolved', 'dismissed').required(),
  adminAction: Joi.string().valid('none', 'warning', 'suspended', 'deleted').optional(),
  adminNotes: Joi.string().max(500).allow('', null),
});

module.exports = { createReportSchema, resolveReportSchema };
