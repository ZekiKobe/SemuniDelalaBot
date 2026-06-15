const { Router } = require('express');
const propertyController = require('../controllers/Property.controller');
const validate = require('../middleware/validate.middleware');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const authorize = require('../middleware/rbac.middleware');
const { uploadImages } = require('../middleware/upload.middleware');
const asyncHandler = require('../../shared/utils/asyncHandler');
const {
  createPropertySchema,
  updatePropertySchema,
  searchPropertySchema,
} = require('../../application/dto/property.dto');
const { LISTING_ROLES } = require('../../domain/enums');

const router = Router();

router.get('/', validate(searchPropertySchema, 'query'), asyncHandler(propertyController.list.bind(propertyController)));
router.get('/featured', asyncHandler(propertyController.getFeatured.bind(propertyController)));
router.get('/new', asyncHandler(propertyController.getNew.bind(propertyController)));
router.get('/popular', asyncHandler(propertyController.getPopular.bind(propertyController)));
router.get('/areas', asyncHandler(propertyController.getAreas.bind(propertyController)));
router.get('/my/listings', authenticate, authorize(...LISTING_ROLES), asyncHandler(propertyController.myListings.bind(propertyController)));
router.get('/:id', optionalAuth, asyncHandler(propertyController.getById.bind(propertyController)));
router.get('/:id/related', asyncHandler(propertyController.getRelated.bind(propertyController)));

router.post('/', authenticate, authorize(...LISTING_ROLES), validate(createPropertySchema), asyncHandler(propertyController.create.bind(propertyController)));
router.put('/:id', authenticate, authorize(...LISTING_ROLES), validate(updatePropertySchema), asyncHandler(propertyController.update.bind(propertyController)));
router.delete('/:id', authenticate, authorize(...LISTING_ROLES), asyncHandler(propertyController.delete.bind(propertyController)));
router.post('/:id/images', authenticate, authorize(...LISTING_ROLES), uploadImages.array('images', 20), asyncHandler(propertyController.uploadImages.bind(propertyController)));
router.delete('/:id/images/:imageId', authenticate, authorize(...LISTING_ROLES), asyncHandler(propertyController.removeImage.bind(propertyController)));
router.post('/:id/submit', authenticate, authorize(...LISTING_ROLES), asyncHandler(propertyController.submit.bind(propertyController)));

module.exports = router;
