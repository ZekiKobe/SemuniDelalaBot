const mongoose = require('mongoose');
const { PropertyStatus, RequirementType, PreferredLanguage } = require('../../../domain/enums');

const paymentProofSchema = new mongoose.Schema({
  fileId: String,
  filePath: String,
  downloadUrl: String,
  uploadedAt: { type: Date, default: Date.now },
});

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    thumbnailUrl: { type: String },
    order: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const requirementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 5, maxlength: 150 },
    description: { type: String, required: true, minlength: 20, maxlength: 2000 },
    budget: { type: Number, required: true, min: 0 },
    minBudget: { type: Number, min: 0 },
    maxBudget: { type: Number, min: 0 },
    location: { type: String, required: true },
    preferredLocation: { type: String },
    listingType: { type: String, enum: ['rent', 'buy'], default: 'rent' },
    requirementType: {
      type: String,
      enum: Object.values(RequirementType),
      default() {
        return this.listingType === 'buy'
          ? RequirementType.WANT_TO_BUY
          : RequirementType.WANT_TO_RENT;
      },
    },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    subcategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    contactPhone: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    preferredLanguage: {
      type: String,
      enum: Object.values(PreferredLanguage),
      default: PreferredLanguage.EN,
    },
    status: { type: String, enum: Object.values(PropertyStatus), default: PropertyStatus.PENDING_PAYMENT },
    paymentProof: paymentProofSchema,
    publishedAt: { type: Date },
    images: {
      type: [imageSchema],
      validate: {
        validator(images) {
          return images.length <= 20;
        },
        message: 'Maximum 20 images allowed',
      },
    },
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

requirementSchema.index({ status: 1, createdBy: 1 });
requirementSchema.index({ requirementType: 1, status: 1 });
requirementSchema.index({ categoryId: 1, subcategoryId: 1, status: 1 });

requirementSchema.pre('save', function syncMarketplaceFields(next) {
  if (!this.requirementType) {
    this.requirementType = this.listingType === 'buy'
      ? RequirementType.WANT_TO_BUY
      : RequirementType.WANT_TO_RENT;
  }
  if (this.budget && !this.maxBudget) this.maxBudget = this.budget;
  if (this.location && !this.preferredLocation) this.preferredLocation = this.location;
  next();
});

module.exports = mongoose.model('Requirement', requirementSchema);
