const Listing = require('../models/Listing.model');
const ListingView = require('../models/ListingView.model');
const MarketplaceFavorite = require('../models/MarketplaceFavorite.model');
const { ListingStatus } = require('../../../domain/enums');

class ListingRepository {
  create(data) {
    return Listing.create(data);
  }

  findById(id) {
    return Listing.findById(id)
      .populate('categoryId', 'name slug')
      .populate('subcategoryId', 'name slug')
      .populate('sellerId', 'fullName username phone');
  }

  findByIdRaw(id) {
    return Listing.findById(id);
  }

  update(id, data) {
    return Listing.findByIdAndUpdate(id, data, { new: true, runValidators: true })
      .populate('categoryId', 'name slug')
      .populate('subcategoryId', 'name slug');
  }

  delete(id) {
    return Listing.findByIdAndDelete(id);
  }

  async search(filter, sort, skip, limit) {
    const query = Listing.find(filter)
      .populate('categoryId', 'name slug')
      .populate('subcategoryId', 'name slug')
      .populate('sellerId', 'fullName username phone')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const [data, total] = await Promise.all([
      query,
      Listing.countDocuments(filter),
    ]);

    return { data, total };
  }

  findApproved(filter = {}, sort = { createdAt: -1 }, limit = 0) {
    const query = Listing.find({ status: ListingStatus.APPROVED, ...filter })
      .populate('categoryId', 'name slug')
      .populate('subcategoryId', 'name slug')
      .populate('sellerId', 'fullName username phone')
      .sort(sort);

    if (Number(limit) > 0) query.limit(Number(limit));
    return query;
  }

  countByStatus(status) {
    return Listing.countDocuments(status ? { status } : {});
  }

  async incrementViews(listingId, viewData) {
    await Promise.all([
      Listing.findByIdAndUpdate(listingId, { $inc: { views: 1 } }),
      ListingView.create({ listingId, ...viewData }),
    ]);
  }

  async addFavorite(userId, listingId) {
    const existing = await MarketplaceFavorite.findOne({ userId, listingId });
    if (existing) return existing;

    const favorite = await MarketplaceFavorite.create({ userId, listingId });
    await Listing.findByIdAndUpdate(listingId, { $inc: { favoritesCount: 1 } });
    return favorite;
  }

  async removeFavorite(userId, listingId) {
    const deleted = await MarketplaceFavorite.findOneAndDelete({ userId, listingId });
    if (deleted) {
      await Listing.findByIdAndUpdate(listingId, { $inc: { favoritesCount: -1 } });
    }
    return deleted;
  }

  async findFavorites(userId, skip, limit) {
    const filter = { userId };
    const [data, total] = await Promise.all([
      MarketplaceFavorite.find(filter)
        .populate({
          path: 'listingId',
          populate: [
            { path: 'categoryId', select: 'name slug' },
            { path: 'subcategoryId', select: 'name slug' },
          ],
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      MarketplaceFavorite.countDocuments(filter),
    ]);

    return { data, total };
  }
}

module.exports = new ListingRepository();
