const { Router } = require('express');
const authRoutes = require('./auth.routes');
const propertyRoutes = require('./property.routes');
const paymentRoutes = require('./payment.routes');
const favoriteRoutes = require('./favorite.routes');
const reportRoutes = require('./report.routes');
const notificationRoutes = require('./notification.routes');
const adminRoutes = require('./admin.routes');
const marketplaceRoutes = require('./marketplace.routes');

const router = Router();

router.use('/auth', authRoutes);
router.use('/properties', propertyRoutes);
router.use('/payments', paymentRoutes);
router.use('/favorites', favoriteRoutes);
router.use('/reports', reportRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);
router.use('/marketplace', marketplaceRoutes);

router.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'healthy', timestamp: new Date().toISOString() } });
});

module.exports = router;
