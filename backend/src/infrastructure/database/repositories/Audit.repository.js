const AuditLog = require('../models/AuditLog.model');

class AuditRepository {
  async log(data) {
    return AuditLog.create(data);
  }

  async findAll(skip, limit, filter = {}) {
    const [data, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('actorId', 'fullName role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(filter),
    ]);
    return { data, total };
  }
}

module.exports = new AuditRepository();
