const Notification = require('../models/Notification.model');

class NotificationRepository {
  async create(data) {
    return Notification.create(data);
  }

  async findByUser(userId, skip, limit) {
    const [data, total] = await Promise.all([
      Notification.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments({ userId }),
    ]);
    return { data, total };
  }

  async markAsRead(id, userId) {
    return Notification.findOneAndUpdate(
      { _id: id, userId },
      { isRead: true },
      { new: true }
    );
  }

  async markAllAsRead(userId) {
    return Notification.updateMany({ userId, isRead: false }, { isRead: true });
  }

  async getUnreadCount(userId) {
    return Notification.countDocuments({ userId, isRead: false });
  }
}

module.exports = new NotificationRepository();
