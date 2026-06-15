const mongoose = require('mongoose');

const marketplaceFavoriteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

marketplaceFavoriteSchema.index({ userId: 1, listingId: 1 }, { unique: true });
marketplaceFavoriteSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('MarketplaceFavorite', marketplaceFavoriteSchema);
