const Joi = require('joi');

const addFavoriteSchema = Joi.object({
  propertyId: Joi.string().required(),
});

module.exports = { addFavoriteSchema };
