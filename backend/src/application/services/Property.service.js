const propertyRepository = require('../../infrastructure/database/repositories/Property.repository');
const AppError = require('../../shared/errors/AppError');
const { normalizeEthiopianPhone } = require('../../shared/utils/phoneValidator');
const { generateSlug } = require('../../shared/utils/slugGenerator');
const imageProcessor = require('../../infrastructure/storage/ImageProcessor.service');
const config = require('../../config');
const authRepository = require('../../infrastructure/database/repositories/Auth.repository');
const { PropertyStatus, UserRole } = require('../../domain/enums');
const path = require('path');
const fs = require('fs').promises;
const mongoose = require('mongoose');

class PropertyService {
  async create(userId, data) {
    const phone = normalizeEthiopianPhone(data.contactPhone);
    if (!phone) throw new AppError('Invalid contact phone', 400, 'VALIDATION_ERROR');

    const user = await authRepository.findById(userId);
    if (user?.role === UserRole.USER) {
      await authRepository.updateUser(userId, { role: UserRole.OWNER });
    }

    const property = await propertyRepository.create({
      ...data,
      contactPhone: phone,
      createdBy: userId,
      status: data.status || PropertyStatus.DRAFT,
      slug: generateSlug(data.title),
    });

    return property;
  }

  async update(propertyId, userId, data, isAdmin = false) {
    const property = await propertyRepository.findByIdRaw(propertyId);
    if (!property) throw new AppError('Property not found', 404, 'PROPERTY_NOT_FOUND');

    if (!isAdmin && !property.createdBy.equals(userId)) {
      throw new AppError('Not authorized', 403, 'AUTH_FORBIDDEN');
    }

    if (!isAdmin && ![PropertyStatus.DRAFT, PropertyStatus.REJECTED].includes(property.status)) {
      throw new AppError('Cannot edit property in current status', 400, 'PROPERTY_INVALID_STATUS');
    }

    if (data.contactPhone) {
      data.contactPhone = normalizeEthiopianPhone(data.contactPhone);
    }

    if (data.title) {
      data.slug = generateSlug(data.title, property._id);
    }

    return propertyRepository.update(propertyId, data);
  }

  async delete(propertyId, userId, isAdmin = false) {
    const property = await propertyRepository.findByIdRaw(propertyId);
    if (!property) throw new AppError('Property not found', 404, 'PROPERTY_NOT_FOUND');

    if (!isAdmin && !property.createdBy.equals(userId)) {
      throw new AppError('Not authorized', 403, 'AUTH_FORBIDDEN');
    }

    const imageUrls = property.images.flatMap((img) => [img.url, img.thumbnailUrl]);
    await imageProcessor.deleteImages(imageUrls);
    return propertyRepository.delete(propertyId);
  }

  async getById(id, incrementView = true) {
    const property = await propertyRepository.findById(id);
    if (!property) throw new AppError('Property not found', 404, 'PROPERTY_NOT_FOUND');

    if (incrementView && property.status === PropertyStatus.APPROVED) {
      await propertyRepository.incrementViews(id);
      property.views += 1;
    }

    return property;
  }

  async search(query) {
    const {
      propertyType, minPrice, maxPrice, bedrooms, bathrooms,
      region, city, subCity, furnished, parking, petsAllowed,
      sort = 'newest', search, page = 1, limit = 20,
    } = query;

    const filter = { status: PropertyStatus.APPROVED };

    if (propertyType) filter.propertyType = propertyType;
    if (minPrice) filter.rentPrice = { ...filter.rentPrice, $gte: minPrice };
    if (maxPrice) filter.rentPrice = { ...filter.rentPrice, $lte: maxPrice };
    if (bedrooms) filter.bedrooms = { $gte: bedrooms };
    if (bathrooms) filter.bathrooms = { $gte: bathrooms };
    if (region) filter.region = new RegExp(region, 'i');
    if (city) filter.city = new RegExp(city, 'i');
    if (subCity) filter.subCity = new RegExp(subCity, 'i');
    if (furnished !== undefined) filter.furnished = furnished;
    if (parking !== undefined) filter.parking = parking;
    if (petsAllowed !== undefined) filter.petsAllowed = petsAllowed;
    if (search) filter.$text = { $search: search };

    const sortMap = {
      newest: { publishedAt: -1 },
      oldest: { publishedAt: 1 },
      price_asc: { rentPrice: 1 },
      price_desc: { rentPrice: -1 },
      views: { views: -1 },
      favorites: { favoritesCount: -1 },
    };

    const skip = (page - 1) * limit;
    return propertyRepository.search(filter, sortMap[sort] || sortMap.newest, skip, limit);
  }

  async getFeatured(limit = 10) {
    return propertyRepository.findApproved({}, { favoritesCount: -1 }, limit);
  }

  async getNew(limit = 10) {
    return propertyRepository.findApproved({}, { publishedAt: -1 }, limit);
  }

  async getPopular(limit = 10) {
    return propertyRepository.findApproved({}, { views: -1 }, limit);
  }

  async getPopularAreas() {
    return propertyRepository.getPopularAreas();
  }

  async getRelated(propertyId) {
    const property = await propertyRepository.findByIdRaw(propertyId);
    if (!property) throw new AppError('Property not found', 404, 'PROPERTY_NOT_FOUND');
    return propertyRepository.findRelated(property);
  }

  async getMyListings(userId, status, page, limit) {
    const skip = (page - 1) * limit;
    return propertyRepository.findByCreator(userId, status, skip, limit);
  }

  async submitForPayment(propertyId, userId) {
    const property = await propertyRepository.findByIdRaw(propertyId);
    if (!property) throw new AppError('Property not found', 404, 'PROPERTY_NOT_FOUND');

    if (!property.createdBy.equals(userId)) {
      throw new AppError('Not authorized', 403, 'AUTH_FORBIDDEN');
    }

    if (![PropertyStatus.DRAFT, PropertyStatus.REJECTED].includes(property.status)) {
      throw new AppError('Property cannot be submitted', 400, 'PROPERTY_INVALID_STATUS');
    }

    const minImages = config.upload.minImagesPerProperty;
    if (minImages > 0 && property.images.length < minImages) {
      throw new AppError(
        `Minimum ${minImages} images required`,
        400,
        'PROPERTY_MIN_IMAGES'
      );
    }

    return propertyRepository.update(propertyId, { status: PropertyStatus.PENDING_PAYMENT });
  }

  async uploadImages(propertyId, userId, files) {
    const property = await propertyRepository.findByIdRaw(propertyId);
    if (!property) throw new AppError('Property not found', 404, 'PROPERTY_NOT_FOUND');

    if (!property.createdBy.equals(userId)) {
      throw new AppError('Not authorized', 403, 'AUTH_FORBIDDEN');
    }

    const totalImages = property.images.length + files.length;
    if (totalImages > config.upload.maxImagesPerProperty) {
      throw new AppError(
        `Maximum ${config.upload.maxImagesPerProperty} images allowed`,
        400,
        'PROPERTY_MAX_IMAGES'
      );
    }

    const outputDir = path.join(config.upload.dir, 'properties', propertyId.toString());
    const newImages = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const processed = await imageProcessor.processImage(file.path, outputDir, file.filename);

      const url = `/uploads/properties/${propertyId}/${processed.mainFilename}`;
      const thumbnailUrl = `/uploads/properties/${propertyId}/${processed.thumbFilename}`;

      newImages.push({
        url,
        thumbnailUrl,
        order: property.images.length + i,
      });

      await fs.unlink(file.path).catch(() => {});
    }

    return propertyRepository.update(propertyId, {
      images: [...property.images, ...newImages],
    });
  }

  async removeImage(propertyId, imageId, userId) {
    const property = await propertyRepository.findByIdRaw(propertyId);
    if (!property) throw new AppError('Property not found', 404, 'PROPERTY_NOT_FOUND');

    if (!property.createdBy.equals(userId)) {
      throw new AppError('Not authorized', 403, 'AUTH_FORBIDDEN');
    }

    const image = property.images.id(imageId);
    if (!image) throw new AppError('Image not found', 404, 'PROPERTY_NOT_FOUND');

    await imageProcessor.deleteImages([image.url, image.thumbnailUrl]);
    image.deleteOne();

    return property.save();
  }
}

module.exports = new PropertyService();
