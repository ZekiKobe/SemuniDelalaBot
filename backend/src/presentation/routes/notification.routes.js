const { Router } = require('express');
const notificationController = require('../controllers/Notification.controller');
const { authenticate } = require('../middleware/auth.middleware');
const asyncHandler = require('../../shared/utils/asyncHandler');

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(notificationController.list.bind(notificationController)));
router.get('/unread-count', asyncHandler(notificationController.unreadCount.bind(notificationController)));
router.put('/read-all', asyncHandler(notificationController.markAllAsRead.bind(notificationController)));
router.put('/:id/read', asyncHandler(notificationController.markAsRead.bind(notificationController)));

module.exports = router;
