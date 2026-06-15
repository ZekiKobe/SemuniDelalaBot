const notificationRepository = require('../../infrastructure/database/repositories/Notification.repository');
const authRepository = require('../../infrastructure/database/repositories/Auth.repository');
const fcmService = require('../../infrastructure/external/firebase/Fcm.service');
const AppError = require('../../shared/errors/AppError');

class NotificationService {
  async createAndSend(userId, { type, title, body, data }) {
    const notification = await notificationRepository.create({
      userId,
      type,
      title,
      body,
      data,
    });

    const user = await authRepository.findById(userId);
    if (user?.fcmTokens?.length) {
      const result = await fcmService.sendToTokens(
        user.fcmTokens,
        { title, body },
        { type, ...data, notificationId: notification._id.toString() }
      );

      if (result.success > 0) {
        notification.sentViaFcm = true;
        await notification.save();
      }
    }

    return notification;
  }

  async getUserNotifications(userId, skip, limit) {
    return notificationRepository.findByUser(userId, skip, limit);
  }

  async markAsRead(id, userId) {
    const notification = await notificationRepository.markAsRead(id, userId);
    if (!notification) {
      throw new AppError('Notification not found', 404, 'NOTIFICATION_NOT_FOUND');
    }
    return notification;
  }

  async markAllAsRead(userId) {
    return notificationRepository.markAllAsRead(userId);
  }

  async getUnreadCount(userId) {
    return notificationRepository.getUnreadCount(userId);
  }
}

module.exports = new NotificationService();
