const Requirement = require('../models/Requirement.model');
const { PropertyStatus } = require('../../../domain/enums');

class RequirementRepository {
  async create(data) {
    return Requirement.create(data);
  }

  async findById(id) {
    return Requirement.findById(id)
      .populate('createdBy', 'fullName phoneNumber telegramUsername telegramChatId')
      .populate('categoryId', 'name slug')
      .populate('subcategoryId', 'name slug');
  }

  async update(id, data) {
    return Requirement.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async findPending(skip = 0, limit = 50) {
    const filter = { status: PropertyStatus.PENDING_APPROVAL };
    const [data, total] = await Promise.all([
      Requirement.find(filter)
        .populate('categoryId', 'name slug')
        .populate('subcategoryId', 'name slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Requirement.countDocuments(filter),
    ]);
    return { data, total };
  }

  async findAll(filter = {}, skip = 0, limit = 50) {
    const [data, total] = await Promise.all([
      Requirement.find(filter)
        .populate('categoryId', 'name slug')
        .populate('subcategoryId', 'name slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Requirement.countDocuments(filter),
    ]);
    return { data, total };
  }
}

module.exports = new RequirementRepository();
