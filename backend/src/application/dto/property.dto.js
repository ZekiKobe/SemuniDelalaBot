const Joi = require('joi');
const { PropertyType } = require('../../domain/enums');
const { isValidEthiopianPhone } = require('../../shared/utils/phoneValidator');

const ethiopianPhone = Joi.string().custom((value, helpers) => {
  if (!isValidEthiopianPhone(value)) {
    return helpers.error('any.invalid');
  }
  return value;
}, 'Ethiopian phone validation');

const propertyBaseFields = {
  title: Joi.string().min(5).max(150),
  description: Joi.string().min(20).max(5000),
  propertyType: Joi.string().valid(...Object.values(PropertyType)),
  rentPrice: Joi.number().min(100),
  depositAmount: Joi.number().min(0),
  isNegotiable: Joi.boolean(),
  region: Joi.string().max(100),
  city: Joi.string().max(100),
  subCity: Joi.string().max(100),
  woreda: Joi.string().max(100).allow('', null),
  kebele: Joi.string().max(100).allow('', null),
  landmark: Joi.string().max(200).allow('', null),
  latitude: Joi.number().min(-90).max(90),
  longitude: Joi.number().min(-180).max(180),
  googleMapsLink: Joi.string().uri().allow('', null),
  bedrooms: Joi.number().min(0).max(20),
  bathrooms: Joi.number().min(0),
  kitchens: Joi.number().min(0),
  livingRooms: Joi.number().min(0),
  parking: Joi.boolean(),
  balcony: Joi.boolean(),
  garden: Joi.boolean(),
  fence: Joi.boolean(),
  waterAvailable: Joi.boolean(),
  electricityAvailable: Joi.boolean(),
  internetAvailable: Joi.boolean(),
  furnished: Joi.boolean(),
  petsAllowed: Joi.boolean(),
  securityGuard: Joi.boolean(),
  cctv: Joi.boolean(),
  generator: Joi.boolean(),
  contactPhone: ethiopianPhone,
  telegramUsername: Joi.string().max(50).allow('', null),
};

const createPropertySchema = Joi.object({
  ...propertyBaseFields,
  title: propertyBaseFields.title.required(),
  description: propertyBaseFields.description.required(),
  propertyType: propertyBaseFields.propertyType.required(),
  rentPrice: propertyBaseFields.rentPrice.required(),
  region: propertyBaseFields.region.required(),
  city: propertyBaseFields.city.required(),
  subCity: propertyBaseFields.subCity.required(),
  contactPhone: propertyBaseFields.contactPhone.required(),
});

const updatePropertySchema = Joi.object(propertyBaseFields).min(1);

const searchPropertySchema = Joi.object({
  propertyType: Joi.string().valid(...Object.values(PropertyType)),
  minPrice: Joi.number().min(0),
  maxPrice: Joi.number().min(0),
  bedrooms: Joi.number().min(0),
  bathrooms: Joi.number().min(0),
  region: Joi.string(),
  city: Joi.string(),
  subCity: Joi.string(),
  furnished: Joi.boolean(),
  parking: Joi.boolean(),
  petsAllowed: Joi.boolean(),
  sort: Joi.string().valid(
    'newest', 'oldest', 'price_asc', 'price_desc', 'views', 'favorites'
  ),
  search: Joi.string().max(200),
  page: Joi.number().min(1),
  limit: Joi.number().min(1).max(100),
});

module.exports = {
  createPropertySchema,
  updatePropertySchema,
  searchPropertySchema,
};
