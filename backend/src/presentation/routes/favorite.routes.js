const { Router } = require('express');
const favoriteController = require('../controllers/Favorite.controller');
const validate = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const asyncHandler = require('../../shared/utils/asyncHandler');
const { addFavoriteSchema } = require('../../application/dto/favorite.dto');

const router = Router();

router.use(authenticate);

router.post('/', validate(addFavoriteSchema), asyncHandler(favoriteController.add.bind(favoriteController)));
router.delete('/:propertyId', asyncHandler(favoriteController.remove.bind(favoriteController)));
router.get('/', asyncHandler(favoriteController.list.bind(favoriteController)));
router.get('/check/:propertyId', asyncHandler(favoriteController.check.bind(favoriteController)));

module.exports = router;
