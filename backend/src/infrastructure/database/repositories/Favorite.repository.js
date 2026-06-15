const Favorite = require('../models/Favorite.model');

class FavoriteRepository {
  async create(userId, propertyId) {
    return Favorite.create({ userId, propertyId });
  }

  async delete(userId, propertyId) {
    return Favorite.findOneAndDelete({ userId, propertyId });
  }

  async findByUser(userId, skip, limit) {
    const [data, total] = await Promise.all([
      Favorite.find({ userId })
        .populate({
          path: 'propertyId',
          select: 'title rentPrice subCity city region propertyType bedrooms bathrooms images slug status',
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Favorite.countDocuments({ userId }),
    ]);
    return { data, total };
  }

  async exists(userId, propertyId) {
    const fav = await Favorite.findOne({ userId, propertyId });
    return !!fav;
  }
}

module.exports = new FavoriteRepository();
