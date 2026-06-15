const mongoose = require('mongoose');
const { PropertyStatus, PropertyType } = require('../../../domain/enums');

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    thumbnailUrl: { type: String },
    order: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const propertySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: 5,
      maxlength: 150,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      minlength: 20,
      maxlength: 5000,
    },
    propertyType: {
      type: String,
      enum: Object.values(PropertyType),
      required: true,
    },
    rentPrice: {
      type: Number,
      required: true,
      min: 100,
    },
    depositAmount: { type: Number, default: 0, min: 0 },
    isNegotiable: { type: Boolean, default: false },

    region: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    subCity: { type: String, required: true, trim: true },
    woreda: { type: String, trim: true },
    kebele: { type: String, trim: true },
    landmark: { type: String, trim: true },
    latitude: { type: Number },
    longitude: { type: Number },
    googleMapsLink: { type: String },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number] },
    },

    bedrooms: { type: Number, default: 0, min: 0, max: 20 },
    bathrooms: { type: Number, default: 0, min: 0 },
    kitchens: { type: Number, default: 0, min: 0 },
    livingRooms: { type: Number, default: 0, min: 0 },
    parking: { type: Boolean, default: false },
    balcony: { type: Boolean, default: false },
    garden: { type: Boolean, default: false },
    fence: { type: Boolean, default: false },
    waterAvailable: { type: Boolean, default: true },
    electricityAvailable: { type: Boolean, default: true },
    internetAvailable: { type: Boolean, default: false },
    furnished: { type: Boolean, default: false },
    petsAllowed: { type: Boolean, default: false },
    securityGuard: { type: Boolean, default: false },
    cctv: { type: Boolean, default: false },
    generator: { type: Boolean, default: false },

    images: {
      type: [imageSchema],
      validate: {
        validator(images) {
          return images.length <= 20;
        },
        message: 'Maximum 20 images allowed',
      },
    },

    contactPhone: { type: String, required: true },
    telegramUsername: { type: String, trim: true },

    status: {
      type: String,
      enum: Object.values(PropertyStatus),
      default: PropertyStatus.DRAFT,
    },
    views: { type: Number, default: 0 },
    favoritesCount: { type: Number, default: 0 },
    rejectionReason: { type: String },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },

    publishedAt: { type: Date },
    expiresAt: { type: Date },
    searchTags: [{ type: String }],
    slug: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

propertySchema.index({ status: 1, publishedAt: -1 });
propertySchema.index({ status: 1, views: -1 });
propertySchema.index({ status: 1, favoritesCount: -1 });
propertySchema.index({ createdBy: 1, status: 1 });
propertySchema.index({ region: 1, city: 1, subCity: 1 });
propertySchema.index({ propertyType: 1, rentPrice: 1, bedrooms: 1 });
propertySchema.index({ rentPrice: 1 });
propertySchema.index({ bedrooms: 1 });
propertySchema.index({ bathrooms: 1 });
propertySchema.index({ location: '2dsphere' });
propertySchema.index({ title: 'text', description: 'text', landmark: 'text' });

propertySchema.pre('save', function setLocation(next) {
  if (this.latitude && this.longitude) {
    this.location = {
      type: 'Point',
      coordinates: [this.longitude, this.latitude],
    };
  } else if (this.location && this.location.type === 'Point' && (!this.location.coordinates || this.location.coordinates.length !== 2)) {
    this.location = undefined;
  }
  if (this.isModified('title') || this.isModified('region') || this.isModified('subCity')) {
    this.searchTags = [
      this.region,
      this.city,
      this.subCity,
      this.propertyType,
    ].filter(Boolean).map((t) => t.toLowerCase());
  }
  next();
});

module.exports = mongoose.model('Property', propertySchema);
