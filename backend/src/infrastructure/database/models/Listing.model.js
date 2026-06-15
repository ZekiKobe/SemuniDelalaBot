const mongoose = require('mongoose');
const { ListingStatus, ListingType, ProductCondition } = require('../../../domain/enums');

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    thumbnailUrl: { type: String },
    order: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const locationSchema = new mongoose.Schema(
  {
    region: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    subCity: { type: String, trim: true },
    area: { type: String, trim: true },
    address: { type: String, trim: true },
    latitude: { type: Number },
    longitude: { type: Number },
    geo: {
      type: { type: String, enum: ['Point'] },
      coordinates: { type: [Number] },
    },
  },
  { _id: false }
);

const propertyDetailsSchema = new mongoose.Schema(
  {
    bedrooms: { type: Number, min: 0 },
    bathrooms: { type: Number, min: 0 },
    area: { type: Number, min: 0 },
    areaUnit: { type: String, default: 'sqm' },
    parking: { type: Boolean },
    furnished: { type: Boolean },
    propertyType: { type: String, trim: true },
  },
  { _id: false }
);

const productDetailsSchema = new mongoose.Schema(
  {
    condition: { type: String, enum: Object.values(ProductCondition) },
    brand: { type: String, trim: true },
    model: { type: String, trim: true },
    year: { type: Number, min: 1900, max: 2100 },
    warranty: { type: Boolean },
  },
  { _id: false }
);

const listingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 5, maxlength: 200 },
    description: { type: String, required: true, minlength: 20, maxlength: 5000 },
    listingType: { type: String, enum: Object.values(ListingType), required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    subcategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    price: { type: Number, min: 0 },
    currency: { type: String, default: 'ETB', trim: true },
    isNegotiable: { type: Boolean, default: false },
    location: locationSchema,
    images: {
      type: [imageSchema],
      validate: {
        validator(images) {
          return images.length <= 20;
        },
        message: 'Maximum 20 images allowed',
      },
    },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    contactPhone: { type: String, required: true },
    telegramUsername: { type: String, trim: true },
    status: { type: String, enum: Object.values(ListingStatus), default: ListingStatus.DRAFT },
    propertyDetails: propertyDetailsSchema,
    productDetails: productDetailsSchema,
    views: { type: Number, default: 0 },
    favoritesCount: { type: Number, default: 0 },
    rejectionReason: { type: String },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    publishedAt: { type: Date },
    expiresAt: { type: Date },
    slug: { type: String, unique: true, sparse: true },
    searchTags: [{ type: String }],
  },
  { timestamps: true }
);

listingSchema.index({ status: 1, publishedAt: -1 });
listingSchema.index({ sellerId: 1, status: 1 });
listingSchema.index({ listingType: 1, status: 1 });
listingSchema.index({ categoryId: 1, subcategoryId: 1, status: 1 });
listingSchema.index({ price: 1 });
listingSchema.index({ 'location.city': 1, 'location.subCity': 1 });
listingSchema.index({ 'location.geo': '2dsphere' });
listingSchema.index({ title: 'text', description: 'text', searchTags: 'text' });

listingSchema.pre('save', function setDerivedFields(next) {
  const hasValidCoordinates =
    Number.isFinite(this.location?.latitude) &&
    Number.isFinite(this.location?.longitude);

  if (hasValidCoordinates) {
    this.location.geo = {
      type: 'Point',
      coordinates: [this.location.longitude, this.location.latitude],
    };
  } else if (this.location?.geo) {
    this.location.geo = undefined;
  }

  if (this.isModified('title') || this.isModified('location') || this.isModified('listingType')) {
    this.searchTags = [
      this.title,
      this.listingType,
      this.location?.city,
      this.location?.subCity,
      this.productDetails?.brand,
      this.productDetails?.model,
      this.propertyDetails?.propertyType,
    ].filter(Boolean).map((tag) => tag.toString().toLowerCase());
  }

  next();
});

module.exports = mongoose.model('Listing', listingSchema);
