const { Router } = require('express');
const listingController = require('../controllers/Listing.controller');
const categoryController = require('../controllers/Category.controller');
const validate = require('../middleware/validate.middleware');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const authorize = require('../middleware/rbac.middleware');
const asyncHandler = require('../../shared/utils/asyncHandler');
const { LISTING_ROLES, ADMIN_ROLES } = require('../../domain/enums');
const {
  createListingSchema,
  updateListingSchema,
  searchListingSchema,
  createCategorySchema,
  updateCategorySchema,
} = require('../../application/dto/marketplace.dto');

const router = Router();

router.get('/categories', asyncHandler(categoryController.list.bind(categoryController)));
router.get('/categories/roots', asyncHandler(categoryController.roots.bind(categoryController)));
router.get('/categories/:id/children', asyncHandler(categoryController.children.bind(categoryController)));
router.post('/categories', authenticate, authorize(...ADMIN_ROLES), validate(createCategorySchema), asyncHandler(categoryController.create.bind(categoryController)));
router.put('/categories/:id', authenticate, authorize(...ADMIN_ROLES), validate(updateCategorySchema), asyncHandler(categoryController.update.bind(categoryController)));

router.get('/listings/featured', asyncHandler(listingController.getFeatured.bind(listingController)));
router.get('/listings/new', asyncHandler(listingController.getNew.bind(listingController)));
router.get('/listings/popular', asyncHandler(listingController.getPopular.bind(listingController)));
router.get('/listings/my', authenticate, authorize(...LISTING_ROLES), validate(searchListingSchema, 'query'), asyncHandler(listingController.myListings.bind(listingController)));
router.get('/listings/saved', authenticate, asyncHandler(listingController.favorites.bind(listingController)));
router.get('/listings', validate(searchListingSchema, 'query'), asyncHandler(listingController.list.bind(listingController)));
router.get('/listings/:id', optionalAuth, asyncHandler(listingController.getById.bind(listingController)));
router.post('/listings', authenticate, authorize(...LISTING_ROLES), validate(createListingSchema), asyncHandler(listingController.create.bind(listingController)));
router.put('/listings/:id', authenticate, authorize(...LISTING_ROLES), validate(updateListingSchema), asyncHandler(listingController.update.bind(listingController)));
router.delete('/listings/:id', authenticate, authorize(...LISTING_ROLES), asyncHandler(listingController.delete.bind(listingController)));
router.post('/listings/:id/submit', authenticate, authorize(...LISTING_ROLES), asyncHandler(listingController.submit.bind(listingController)));
router.post('/listings/:id/favorite', authenticate, asyncHandler(listingController.addFavorite.bind(listingController)));
router.delete('/listings/:id/favorite', authenticate, asyncHandler(listingController.removeFavorite.bind(listingController)));

module.exports = router;
