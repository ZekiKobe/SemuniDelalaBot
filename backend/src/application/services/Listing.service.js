const listingRepository = require('../../infrastructure/database/repositories/Listing.repository');
const categoryService = require('./Category.service');
const AppError = require('../../shared/errors/AppError');
const { normalizeEthiopianPhone } = require('../../shared/utils/phoneValidator');
const { generateSlug } = require('../../shared/utils/slugGenerator');
const {
  ListingStatus,
  ListingType,
  ProductCondition,
} = require('../../domain/enums');

class ListingService {
  async create(userId, data) {
    await this.validateCategories(data.categoryId, data.subcategoryId);

    const phone = normalizeEthiopianPhone(data.contactPhone);
    if (!phone) throw new AppError('Invalid contact phone', 400, 'VALIDATION_ERROR');

    const payload = {
      ...data,
      sellerId: userId,
      contactPhone: phone,
      status: data.status || ListingStatus.DRAFT,
      slug: generateSlug(data.title),
    };

    this.normalizeDetails(payload);
    return listingRepository.create(payload);
  }

  async update(listingId, userId, data, isAdmin = false) {
    const listing = await listingRepository.findByIdRaw(listingId);
    if (!listing) throw new AppError('Listing not found', 404, 'LISTING_NOT_FOUND');

    if (!isAdmin && !listing.sellerId.equals(userId)) {
      throw new AppError('Not authorized', 403, 'AUTH_FORBIDDEN');
    }

    if (!isAdmin && ![ListingStatus.DRAFT, ListingStatus.REJECTED].includes(listing.status)) {
      throw new AppError('Cannot edit listing in current status', 400, 'LISTING_INVALID_STATUS');
    }

    if (data.categoryId || data.subcategoryId !== undefined) {
      await this.validateCategories(
        data.categoryId || listing.categoryId,
        data.subcategoryId !== undefined ? data.subcategoryId : listing.subcategoryId
      );
    }

    if (data.contactPhone) {
      data.contactPhone = normalizeEthiopianPhone(data.contactPhone);
      if (!data.contactPhone) throw new AppError('Invalid contact phone', 400, 'VALIDATION_ERROR');
    }

    if (data.title) data.slug = generateSlug(data.title, listing._id);

    const nextPayload = { ...listing.toObject(), ...data };
    this.normalizeDetails(nextPayload);
    if (nextPayload.listingType !== listing.listingType || data.productDetails || data.propertyDetails) {
      data.productDetails = nextPayload.productDetails;
      data.propertyDetails = nextPayload.propertyDetails;
    }

    return listingRepository.update(listingId, data);
  }

  async getById(id, viewer = {}) {
    const listing = await listingRepository.findById(id);
    if (!listing) throw new AppError('Listing not found', 404, 'LISTING_NOT_FOUND');

    if (listing.status === ListingStatus.APPROVED) {
      await listingRepository.incrementViews(id, viewer);
      listing.views += 1;
    }

    return listing;
  }

  async search(query) {
    const {
      categoryId,
      subcategoryId,
      listingType,
      city,
      subCity,
      minPrice,
      maxPrice,
      condition,
      brand,
      datePosted,
      search,
      status = ListingStatus.APPROVED,
      sellerId,
      sort = 'newest',
      page = 1,
      limit = 20,
    } = query;

    const filter = {};
    if (status !== 'all') filter.status = status;
    if (sellerId) filter.sellerId = sellerId;
    if (categoryId) filter.categoryId = categoryId;
    if (subcategoryId) filter.subcategoryId = subcategoryId;
    if (listingType) filter.listingType = listingType;
    if (city) filter['location.city'] = new RegExp(city, 'i');
    if (subCity) filter['location.subCity'] = new RegExp(subCity, 'i');
    if (minPrice) filter.price = { ...filter.price, $gte: Number(minPrice) };
    if (maxPrice) filter.price = { ...filter.price, $lte: Number(maxPrice) };
    if (condition) filter['productDetails.condition'] = condition;
    if (brand) filter['productDetails.brand'] = new RegExp(brand, 'i');
    if (search) filter.$text = { $search: search };
    if (datePosted) filter.createdAt = { $gte: this.getDateFloor(datePosted) };

    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      price_asc: { price: 1 },
      price_desc: { price: -1 },
      views: { views: -1 },
      favorites: { favoritesCount: -1 },
    };

    const skip = (Number(page) - 1) * Number(limit);
    return listingRepository.search(filter, sortMap[sort] || sortMap.newest, skip, Number(limit));
  }

  async getFeatured(limit = 10) {
    const filter = { 
      status: ListingStatus.APPROVED,
      listingType: ListingType.PRODUCT_SALE 
    };
    const { data } = await listingRepository.search(filter, { favoritesCount: -1, views: -1 }, 0, limit);
    return data;
  }

  async getNew(limit = 10) {
    const filter = { 
      status: ListingStatus.APPROVED,
      listingType: ListingType.PRODUCT_SALE 
    };
    const { data } = await listingRepository.search(filter, { publishedAt: -1, createdAt: -1 }, 0, limit);
    return data;
  }

  async getPopular(limit = 10) {
    const filter = { 
      status: ListingStatus.APPROVED,
      listingType: ListingType.PRODUCT_SALE 
    };
    const { data } = await listingRepository.search(filter, { views: -1 }, 0, limit);
    return data;
  }

  async submit(listingId, userId) {
    const listing = await listingRepository.findByIdRaw(listingId);
    if (!listing) throw new AppError('Listing not found', 404, 'LISTING_NOT_FOUND');
    if (!listing.sellerId.equals(userId)) throw new AppError('Not authorized', 403, 'AUTH_FORBIDDEN');
    if (![ListingStatus.DRAFT, ListingStatus.REJECTED].includes(listing.status)) {
      throw new AppError('Listing cannot be submitted', 400, 'LISTING_INVALID_STATUS');
    }
    return listingRepository.update(listingId, { status: ListingStatus.PENDING_APPROVAL });
  }

  async delete(listingId, userId, isAdmin = false) {
    const listing = await listingRepository.findByIdRaw(listingId);
    if (!listing) throw new AppError('Listing not found', 404, 'LISTING_NOT_FOUND');
    if (!isAdmin && !listing.sellerId.equals(userId)) throw new AppError('Not authorized', 403, 'AUTH_FORBIDDEN');
    return listingRepository.delete(listingId);
  }

  async getMyListings(userId, query) {
    return this.search({ ...query, status: query.status || 'all', sellerId: userId });
  }

  async addFavorite(userId, listingId) {
    const listing = await listingRepository.findByIdRaw(listingId);
    if (!listing) throw new AppError('Listing not found', 404, 'LISTING_NOT_FOUND');
    return listingRepository.addFavorite(userId, listingId);
  }

  async removeFavorite(userId, listingId) {
    return listingRepository.removeFavorite(userId, listingId);
  }

  async getFavorites(userId, page = 1, limit = 20) {
    const skip = (Number(page) - 1) * Number(limit);
    return listingRepository.findFavorites(userId, skip, Number(limit));
  }

  async validateCategories(categoryId, subcategoryId) {
    if (subcategoryId) {
      await categoryService.assertChildOfParent(categoryId, subcategoryId);
      return;
    }

    await categoryService.assertActive(categoryId);
  }

  normalizeDetails(payload) {
    if ([ListingType.HOUSE_RENT, ListingType.HOUSE_SALE].includes(payload.listingType)) {
      payload.productDetails = undefined;
      return;
    }

    if (payload.listingType === ListingType.PRODUCT_SALE) {
      payload.propertyDetails = undefined;
      payload.productDetails = {
        ...payload.productDetails,
        condition: payload.productDetails?.condition || ProductCondition.USED,
      };
    }
  }

  getDateFloor(datePosted) {
    const now = new Date();
    const days = {
      today: 1,
      week: 7,
      month: 30,
    }[datePosted] || Number(datePosted);

    if (!days || Number.isNaN(days)) return new Date(0);
    now.setDate(now.getDate() - days);
    return now;
  }
}

module.exports = new ListingService();
