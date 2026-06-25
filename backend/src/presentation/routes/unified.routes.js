const { Router } = require('express');
const unifiedListingController = require('../controllers/UnifiedListing.controller');
const asyncHandler = require('../../shared/utils/asyncHandler');

const router = Router();

router.get('/listings/for-rent', asyncHandler(unifiedListingController.getForRent.bind(unifiedListingController)));
router.get('/listings/for-sale', asyncHandler(unifiedListingController.getForSale.bind(unifiedListingController)));
router.get('/listings/marketplace', asyncHandler(unifiedListingController.getMarketplace.bind(unifiedListingController)));
router.get('/listings/featured', asyncHandler(unifiedListingController.getFeatured.bind(unifiedListingController)));

module.exports = router;
