const Property = require('../models/Property.model');
const { PropertyStatus } = require('../../../domain/enums');

class PropertyRepository {
  async create(data) {
    return Property.create(data);
  }

  async findById(id) {
    return Property.findById(id).populate('createdBy', 'fullName phoneNumber profileImage');
  }

  async findByIdRaw(id) {
    return Property.findById(id);
  }

  async update(id, data) {
    return Property.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async delete(id) {
    return Property.findByIdAndDelete(id);
  }

  async incrementViews(id) {
    return Property.findByIdAndUpdate(id, { $inc: { views: 1 } });
  }

  async search(filter, sort, skip, limit) {
    const query = Property.find(filter)
      .populate('createdBy', 'fullName phoneNumber profileImage')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const [data, total] = await Promise.all([
      query.exec(),
      Property.countDocuments(filter),
    ]);

    return { data, total };
  }

  async findApproved(filter = {}, sort = { createdAt: -1 }, limit = 0) {
    const query = Property.find({ status: PropertyStatus.APPROVED, ...filter })
      .sort(sort)
      .select('title rentPrice subCity city region propertyType bedrooms bathrooms images slug views contactPhone publishedAt createdAt');

    if (Number(limit) > 0) query.limit(Number(limit));
    return query;
  }

  async findByCreator(userId, status, skip, limit) {
    const filter = { createdBy: userId };
    if (status) filter.status = status;

    const [data, total] = await Promise.all([
      Property.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Property.countDocuments(filter),
    ]);

    return { data, total };
  }

  async getPopularAreas() {
    return Property.aggregate([
      { $match: { status: PropertyStatus.APPROVED } },
      {
        $group: {
          _id: { subCity: '$subCity', city: '$city' },
          count: { $sum: 1 },
          avgPrice: { $avg: '$rentPrice' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 20 },
      {
        $project: {
          _id: 0,
          name: '$_id.subCity',
          city: '$_id.city',
          count: 1,
          avgPrice: { $round: ['$avgPrice', 0] },
        },
      },
    ]);
  }

  async findRelated(property, limit = 6) {
    return Property.find({
      _id: { $ne: property._id },
      status: PropertyStatus.APPROVED,
      $or: [
        { subCity: property.subCity },
        { propertyType: property.propertyType },
      ],
    })
      .sort({ publishedAt: -1 })
      .limit(limit)
      .select('title rentPrice subCity city images slug bedrooms bathrooms propertyType');
  }

  async countByStatus(status) {
    const filter = status ? { status } : {};
    return Property.countDocuments(filter);
  }

  async updateFavoritesCount(propertyId, increment) {
    return Property.findByIdAndUpdate(
      propertyId,
      { $inc: { favoritesCount: increment } },
      { new: true }
    );
  }

  async expireListings(beforeDate) {
    return Property.updateMany(
      {
        status: PropertyStatus.APPROVED,
        expiresAt: { $lte: beforeDate },
      },
      { status: PropertyStatus.EXPIRED }
    );
  }
}

module.exports = new PropertyRepository();
