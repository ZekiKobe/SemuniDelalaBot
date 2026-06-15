const { Router } = require('express');
const paymentController = require('../controllers/Payment.controller');
const validate = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const authorize = require('../middleware/rbac.middleware');
const { uploadScreenshot } = require('../middleware/upload.middleware');
const asyncHandler = require('../../shared/utils/asyncHandler');
const { createPaymentSchema, submitPaymentSchema } = require('../../application/dto/payment.dto');
const { LISTING_ROLES } = require('../../domain/enums');

const router = Router();

router.use(authenticate);

router.get('/instructions', authorize(...LISTING_ROLES), asyncHandler(paymentController.getInstructions.bind(paymentController)));
router.post('/create', authorize(...LISTING_ROLES), validate(createPaymentSchema), asyncHandler(paymentController.create.bind(paymentController)));
router.post('/:id/submit', authorize(...LISTING_ROLES), uploadScreenshot.single('screenshot'), validate(submitPaymentSchema), asyncHandler(paymentController.submit.bind(paymentController)));
router.get('/history', asyncHandler(paymentController.getHistory.bind(paymentController)));
router.get('/:id', asyncHandler(paymentController.getById.bind(paymentController)));

module.exports = router;
