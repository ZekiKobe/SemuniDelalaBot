const Joi = require('joi');
const {
  ListingStatus,
  ListingType,
  ProductCondition,
} = require('../../domain/enums');

const objectId = Joi.string().hex().length(24);

const locationSchema = Joi.object({
  region: Joi.string().trim().max(100),
  city: Joi.string().trim().max(100).required(),
  subCity: Joi.string().trim().max(100),
  area: Joi.string().trim().max(150),
  address: Joi.string().trim().max(500),
  latitude: Joi.number().min(-90).max(90),
  longitude: Joi.number().min(-180).max(180),
});

const propertyDetailsSchema = Joi.object({
  bedrooms: Joi.number().integer().min(0),
  bathrooms: Joi.number().integer().min(0),
  area: Joi.number().min(0),
  areaUnit: Joi.string().trim().max(20),
  parking: Joi.boolean(),
  furnished: Joi.boolean(),
  propertyType: Joi.string().trim().max(80),
});

const productDetailsSchema = Joi.object({
  condition: Joi.string().valid(...Object.values(ProductCondition)),
  brand: Joi.string().trim().max(100),
  model: Joi.string().trim().max(100),
  year: Joi.number().integer().min(1900).max(2100),
  warranty: Joi.boolean(),
});

const createListingSchema = Joi.object({
  title: Joi.string().trim().min(5).max(200).required(),
  description: Joi.string().trim().min(20).max(5000).required(),
  listingType: Joi.string().valid(...Object.values(ListingType)).required(),
  categoryId: objectId.required(),
  subcategoryId: objectId,
  price: Joi.number().min(0).required(),
  currency: Joi.string().trim().max(10).default('ETB'),
  isNegotiable: Joi.boolean().default(false),
  location: locationSchema.required(),
  contactPhone: Joi.string().trim().required(),
  telegramUsername: Joi.string().trim().max(100),
  propertyDetails: propertyDetailsSchema,
  productDetails: productDetailsSchema,
});

const updateListingSchema = createListingSchema.fork(
  ['title', 'description', 'listingType', 'categoryId', 'price', 'location', 'contactPhone'],
  (schema) => schema.optional()
);

const searchListingSchema = Joi.object({
  categoryId: objectId,
  subcategoryId: objectId,
  listingType: Joi.string().valid(...Object.values(ListingType)),
  city: Joi.string().trim().max(100),
  subCity: Joi.string().trim().max(100),
  minPrice: Joi.number().min(0),
  maxPrice: Joi.number().min(0),
  condition: Joi.string().valid(...Object.values(ProductCondition)),
  brand: Joi.string().trim().max(100),
  datePosted: Joi.alternatives().try(Joi.string().valid('today', 'week', 'month'), Joi.number().integer().min(1)),
  search: Joi.string().trim().max(100),
  status: Joi.string().valid(...Object.values(ListingStatus), 'all'),
  sort: Joi.string().valid('newest', 'oldest', 'price_asc', 'price_desc', 'views', 'favorites'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

const createCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  slug: Joi.string().trim().lowercase().max(120),
  parentId: objectId,
  icon: Joi.string().trim().max(80),
  sortOrder: Joi.number().integer().default(0),
  isActive: Joi.boolean().default(true),
  metadata: Joi.object().unknown(true),
});

const updateCategorySchema = createCategorySchema.fork(['name'], (schema) => schema.optional());

module.exports = {
  createListingSchema,
  updateListingSchema,
  searchListingSchema,
  createCategorySchema,
  updateCategorySchema,
};
