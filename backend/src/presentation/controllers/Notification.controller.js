const notificationService = require('../../application/services/Notification.service');
const { buildPaginationMeta } = require('../../shared/utils/pagination');

class NotificationController {
  async list(req, res) {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const { data, total } = await notificationService.getUserNotifications(
      req.user._id,
      skip,
      Number(limit)
    );
    res.json({
      success: true,
      data,
      meta: buildPaginationMeta(Number(page), Number(limit), total),
    });
  }

  async markAsRead(req, res) {
    const notification = await notificationService.markAsRead(
      req.params.id,
      req.user._id
    );
    res.json({ success: true, data: notification });
  }

  async markAllAsRead(req, res) {
    await notificationService.markAllAsRead(req.user._id);
    res.json({ success: true, data: { message: 'All notifications marked as read' } });
  }

  async unreadCount(req, res) {
    const count = await notificationService.getUnreadCount(req.user._id);
    res.json({ success: true, data: { count } });
  }
}

module.exports = new NotificationController();
