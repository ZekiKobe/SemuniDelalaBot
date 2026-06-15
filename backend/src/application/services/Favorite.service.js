const favoriteRepository = require('../../infrastructure/database/repositories/Favorite.repository');
const propertyRepository = require('../../infrastructure/database/repositories/Property.repository');
const AppError = require('../../shared/errors/AppError');
const { PropertyStatus } = require('../../domain/enums');

class FavoriteService {
  async add(userId, propertyId) {
    const property = await propertyRepository.findByIdRaw(propertyId);
    if (!property || property.status !== PropertyStatus.APPROVED) {
      throw new AppError('Property not found', 404, 'PROPERTY_NOT_FOUND');
    }

    const exists = await favoriteRepository.exists(userId, propertyId);
    if (exists) {
      throw new AppError('Already in favorites', 409, 'FAVORITE_ALREADY_EXISTS');
    }

    const favorite = await favoriteRepository.create(userId, propertyId);
    await propertyRepository.updateFavoritesCount(propertyId, 1);
    return favorite;
  }

  async remove(userId, propertyId) {
    const favorite = await favoriteRepository.delete(userId, propertyId);
    if (!favorite) {
      throw new AppError('Favorite not found', 404, 'FAVORITE_NOT_FOUND');
    }

    await propertyRepository.updateFavoritesCount(propertyId, -1);
    return { message: 'Removed from favorites' };
  }

  async getUserFavorites(userId, skip, limit) {
    return favoriteRepository.findByUser(userId, skip, limit);
  }

  async isFavorited(userId, propertyId) {
    return favoriteRepository.exists(userId, propertyId);
  }
}

module.exports = new FavoriteService();
