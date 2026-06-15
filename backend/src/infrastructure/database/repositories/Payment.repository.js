const Payment = require('../models/Payment.model');
const { PaymentStatus } = require('../../../domain/enums');

class PaymentRepository {
  async create(data) {
    return Payment.create(data);
  }

  async findById(id) {
    return Payment.findById(id)
      .populate('userId', 'fullName phoneNumber')
      .populate('propertyId', 'title status');
  }

  async findByIdRaw(id) {
    return Payment.findById(id);
  }

  async findActiveByProperty(propertyId) {
    return Payment.findOne({
      propertyId,
      status: { $in: [PaymentStatus.CREATED, PaymentStatus.SUBMITTED] },
    });
  }

  async findByTransactionRef(ref) {
    return Payment.findOne({
      transactionReference: ref,
      status: PaymentStatus.APPROVED,
    });
  }

  async update(id, data) {
    return Payment.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async findByUser(userId, skip, limit) {
    const [data, total] = await Promise.all([
      Payment.find({ userId })
        .populate('propertyId', 'title status images')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Payment.countDocuments({ userId }),
    ]);
    return { data, total };
  }

  async findPending(skip, limit) {
    const filter = { status: PaymentStatus.SUBMITTED };
    const [data, total] = await Promise.all([
      Payment.find(filter)
        .populate('userId', 'fullName phoneNumber')
        .populate('propertyId', 'title')
        .sort({ submittedAt: 1 })
        .skip(skip)
        .limit(limit),
      Payment.countDocuments(filter),
    ]);
    return { data, total };
  }

  async findAll(filter, skip, limit) {
    const [data, total] = await Promise.all([
      Payment.find(filter)
        .populate('userId', 'fullName phoneNumber')
        .populate('propertyId', 'title status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Payment.countDocuments(filter),
    ]);
    return { data, total };
  }

  async getRevenueStats() {
    const [total, daily, monthly] = await Promise.all([
      Payment.aggregate([
        { $match: { status: PaymentStatus.APPROVED } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        {
          $match: {
            status: PaymentStatus.APPROVED,
            verifiedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        {
          $match: {
            status: PaymentStatus.APPROVED,
            verifiedAt: {
              $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
    ]);

    return {
      totalRevenue: total[0]?.total || 0,
      totalPayments: total[0]?.count || 0,
      dailyRevenue: daily[0]?.total || 0,
      dailyPayments: daily[0]?.count || 0,
      monthlyRevenue: monthly[0]?.total || 0,
      monthlyPayments: monthly[0]?.count || 0,
    };
  }
}

module.exports = new PaymentRepository();
