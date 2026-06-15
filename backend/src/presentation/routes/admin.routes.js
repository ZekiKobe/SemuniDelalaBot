const { Router } = require('express');
const adminController = require('../controllers/Admin.controller');
const validate = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const authorize = require('../middleware/rbac.middleware');
const asyncHandler = require('../../shared/utils/asyncHandler');
const {
  updateUserStatusSchema,
  updateUserRoleSchema,
  rejectPropertySchema,
  rejectPaymentSchema,
  updateSettingsSchema,
} = require('../../application/dto/admin.dto');
const { resolveReportSchema } = require('../../application/dto/report.dto');
const { ADMIN_ROLES, UserRole } = require('../../domain/enums');

const router = Router();

router.use(authenticate, authorize(...ADMIN_ROLES));

router.get('/dashboard', asyncHandler(adminController.dashboard.bind(adminController)));

router.get('/users', asyncHandler(adminController.getUsers.bind(adminController)));
router.get('/users/:id', asyncHandler(adminController.getUserById.bind(adminController)));
router.put('/users/:id/status', validate(updateUserStatusSchema), asyncHandler(adminController.updateUserStatus.bind(adminController)));
router.put('/users/:id/role', authorize(UserRole.SUPER_ADMIN), validate(updateUserRoleSchema), asyncHandler(adminController.updateUserRole.bind(adminController)));

router.get('/properties', asyncHandler(adminController.getProperties.bind(adminController)));
router.put('/properties/:id/approve', asyncHandler(adminController.approveProperty.bind(adminController)));
router.put('/properties/:id/reject', validate(rejectPropertySchema), asyncHandler(adminController.rejectProperty.bind(adminController)));
router.put('/properties/:id/suspend', asyncHandler(adminController.suspendProperty.bind(adminController)));

router.get('/marketplace/listings', asyncHandler(adminController.getMarketplaceListings.bind(adminController)));
router.put('/marketplace/listings/:id/approve', asyncHandler(adminController.approveMarketplaceListing.bind(adminController)));
router.put('/marketplace/listings/:id/reject', validate(rejectPropertySchema), asyncHandler(adminController.rejectMarketplaceListing.bind(adminController)));

router.get('/payments', asyncHandler(adminController.getPayments.bind(adminController)));
router.put('/payments/:id/approve', asyncHandler(adminController.approvePayment.bind(adminController)));
router.put('/payments/:id/reject', validate(rejectPaymentSchema), asyncHandler(adminController.rejectPayment.bind(adminController)));

router.get('/reports', asyncHandler(adminController.getReports.bind(adminController)));
router.put('/reports/:id/resolve', validate(resolveReportSchema), asyncHandler(adminController.resolveReport.bind(adminController)));

router.get('/requirements', asyncHandler(adminController.getRequirements.bind(adminController)));
router.put('/requirements/:id/approve', asyncHandler(adminController.approveRequirement.bind(adminController)));
router.put('/requirements/:id/reject', validate(rejectPaymentSchema), asyncHandler(adminController.rejectRequirement.bind(adminController)));

router.get('/settings', asyncHandler(adminController.getSettings.bind(adminController)));
router.put('/settings', authorize(UserRole.SUPER_ADMIN), validate(updateSettingsSchema), asyncHandler(adminController.updateSettings.bind(adminController)));

router.get('/audit-logs', authorize(UserRole.SUPER_ADMIN), asyncHandler(adminController.getAuditLogs.bind(adminController)));
router.get('/telegram/posts', asyncHandler(adminController.getTelegramPosts.bind(adminController)));

module.exports = router;
