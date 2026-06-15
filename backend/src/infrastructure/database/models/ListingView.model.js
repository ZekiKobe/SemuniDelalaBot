const mongoose = require('mongoose');

const listingViewSchema = new mongoose.Schema(
  {
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

listingViewSchema.index({ listingId: 1, createdAt: -1 });
listingViewSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('ListingView', listingViewSchema);
