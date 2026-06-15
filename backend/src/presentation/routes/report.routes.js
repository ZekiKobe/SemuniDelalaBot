const { Router } = require('express');
const reportController = require('../controllers/Report.controller');
const validate = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const asyncHandler = require('../../shared/utils/asyncHandler');
const { createReportSchema } = require('../../application/dto/report.dto');

const router = Router();

router.use(authenticate);

router.post('/', validate(createReportSchema), asyncHandler(reportController.create.bind(reportController)));
router.get('/my', asyncHandler(reportController.myReports.bind(reportController)));

module.exports = router;
