const Report = require('../models/Report.model');
const { ReportStatus } = require('../../../domain/enums');

class ReportRepository {
  async create(data) {
    return Report.create(data);
  }

  async findByUserAndProperty(userId, propertyId) {
    return Report.findOne({ reportedBy: userId, propertyId });
  }

  async findPending(skip, limit) {
    const filter = { status: ReportStatus.PENDING };
    const [data, total] = await Promise.all([
      Report.find(filter)
        .populate('propertyId', 'title status images')
        .populate('reportedBy', 'fullName phoneNumber')
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit),
      Report.countDocuments(filter),
    ]);
    return { data, total };
  }

  async findByUser(userId, skip, limit) {
    const [data, total] = await Promise.all([
      Report.find({ reportedBy: userId })
        .populate('propertyId', 'title status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Report.countDocuments({ reportedBy: userId }),
    ]);
    return { data, total };
  }

  async update(id, data) {
    return Report.findByIdAndUpdate(id, data, { new: true });
  }

  async findById(id) {
    return Report.findById(id);
  }
}

module.exports = new ReportRepository();
