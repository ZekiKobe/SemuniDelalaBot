const propertyRepository = require('../../infrastructure/database/repositories/Property.repository');
const listingRepository = require('../../infrastructure/database/repositories/Listing.repository');
const requirementRepository = require('../../infrastructure/database/repositories/Requirement.repository');
const { PropertyStatus, ListingStatus, ListingType } = require('../../domain/enums');

class UnifiedListingService {
  /**
   * Helper to resolve image URLs to absolute URLs
   */
  resolveImageUrl(url) {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // Return relative path - the mobile app will prepend the base URL
    return url;
  }

  /**
   * Transform images array
   */
  transformImages(images) {
    if (!images || !Array.isArray(images)) return [];
    return images.map((img) => ({
      _id: img._id?.toString() || '',
      url: this.resolveImageUrl(img.url),
      thumbnailUrl: img.thumbnailUrl ? this.resolveImageUrl(img.thumbnailUrl) : null,
      order: img.order || 0,
      uploadedAt: img.uploadedAt,
    }));
  }

  /**
   * Normalize Property model to unified format
   */
  normalizeProperty(property) {
    const propObj = property.toObject ? property.toObject() : property;
    
    return {
      id: propObj._id.toString(),
      title: propObj.title,
      description: propObj.description,
      price: propObj.rentPrice,
      isNegotiable: propObj.isNegotiable || false,
      category: 'rent', // Properties are always for rent in Property collection
      propertyType: propObj.propertyType,
      productCategory: null,
      condition: null,
      brand: null,
      images: this.transformImages(propObj.images),
      primaryImage: this.resolveImageUrl(propObj.images?.[0]?.url),
      location: {
        city: propObj.city,
        subCity: propObj.subCity,
        region: propObj.region,
        full: `${propObj.subCity}, ${propObj.city}`,
      },
      contactPhone: propObj.contactPhone,
      bedrooms: propObj.bedrooms,
      bathrooms: propObj.bathrooms,
      views: propObj.views || 0,
      favoritesCount: propObj.favoritesCount || 0,
      isFavorite: propObj.isFavorite || false,
      fromTelegram: !!propObj.telegramUsername,
      telegramUsername: propObj.telegramUsername,
      status: propObj.status,
      createdAt: propObj.createdAt,
      publishedAt: propObj.publishedAt,
      source: 'property',
    };
  }

  /**
   * Normalize Requirement model to unified format
   */
  normalizeRequirement(requirement) {
    const reqObj = requirement.toObject ? requirement.toObject() : requirement;
    
    // Determine category based on listingType
    const category = reqObj.listingType === 'buy' ? 'sale' : 'rent';
    
    const categoryInfo = reqObj.categoryId || {};
    const subcategoryInfo = reqObj.subcategoryId || {};

    return {
      id: reqObj._id.toString(),
      title: reqObj.title,
      description: reqObj.description,
      price: reqObj.budget || reqObj.maxBudget || 0,
      isNegotiable: true,
      category,
      propertyType: null,
      productCategory: categoryInfo.name || null,
      productSubcategory: subcategoryInfo.name || null,
      condition: null,
      brand: null,
      model: null,
      images: this.transformImages(reqObj.images),
      primaryImage: this.resolveImageUrl(reqObj.images?.[0]?.url),
      location: {
        city: reqObj.location,
        subCity: null,
        region: null,
        area: reqObj.preferredLocation,
        full: reqObj.location || '',
      },
      contactPhone: reqObj.contactPhone,
      bedrooms: null,
      bathrooms: null,
      area: null,
      furnished: null,
      parking: null,
      views: 0,
      favoritesCount: 0,
      isFavorite: false,
      fromTelegram: true,
      telegramUsername: reqObj.createdBy?.telegramUsername,
      status: reqObj.status,
      createdAt: reqObj.createdAt,
      publishedAt: reqObj.publishedAt,
      source: 'requirement',
      isRequirement: true,
    };
  }

  /**
   * Normalize Listing model to unified format
   */
  normalizeListing(listing) {
    const listObj = listing.toObject ? listing.toObject() : listing;
    
    // Determine category based on listingType
    let category = 'marketplace';
    if (listObj.listingType === ListingType.HOUSE_RENT) {
      category = 'rent';
    } else if (listObj.listingType === ListingType.HOUSE_SALE) {
      category = 'sale';
    } else if (listObj.listingType === ListingType.PRODUCT_SALE) {
      category = 'marketplace';
    }

    const location = listObj.location || {};
    const propertyDetails = listObj.propertyDetails || {};
    const productDetails = listObj.productDetails || {};
    const categoryInfo = listObj.categoryId || {};
    const subcategoryInfo = listObj.subcategoryId || {};

    return {
      id: listObj._id.toString(),
      title: listObj.title,
      description: listObj.description,
      price: listObj.price,
      isNegotiable: listObj.isNegotiable || false,
      category,
      propertyType: propertyDetails.propertyType || null,
      productCategory: categoryInfo.name || null,
      productSubcategory: subcategoryInfo.name || null,
      condition: productDetails.condition || null,
      brand: productDetails.brand || null,
      model: productDetails.model || null,
      images: this.transformImages(listObj.images),
      primaryImage: this.resolveImageUrl(listObj.images?.[0]?.url),
      location: {
        city: location.city,
        subCity: location.subCity,
        region: location.region,
        area: location.area,
        full: [location.subCity, location.city].filter(Boolean).join(', '),
      },
      contactPhone: listObj.contactPhone,
      bedrooms: propertyDetails.bedrooms,
      bathrooms: propertyDetails.bathrooms,
      area: propertyDetails.area,
      furnished: propertyDetails.furnished,
      parking: propertyDetails.parking,
      views: listObj.views || 0,
      favoritesCount: listObj.favoritesCount || 0,
      isFavorite: listObj.isFavorite || false,
      fromTelegram: !!listObj.telegramUsername,
      telegramUsername: listObj.telegramUsername,
      status: listObj.status,
      createdAt: listObj.createdAt,
      publishedAt: listObj.publishedAt,
      source: 'listing',
    };
  }

  /**
   * Get all listings for rent (properties, house rentals, and requirements)
   */
  async getForRent(limit = 20, sort = 'newest') {
    try {
      const sortMap = {
        newest: { publishedAt: -1, createdAt: -1 },
        popular: { views: -1 },
        price_asc: { rentPrice: 1 },
        price_desc: { rentPrice: -1 },
      };

      // Fetch from Property collection (all are for rent)
      const properties = await propertyRepository.findApproved(
        {},
        sortMap[sort] || sortMap.newest,
        limit
      );

      // Fetch from Listing collection (HOUSE_RENT type)
      const { data: listings } = await listingRepository.search(
        {
          status: ListingStatus.APPROVED,
          listingType: ListingType.HOUSE_RENT,
        },
        sortMap[sort] || sortMap.newest,
        0,
        limit
      );

      // Fetch from Requirement collection (rent type)
      const { data: requirements } = await requirementRepository.findAll(
        {
          status: PropertyStatus.APPROVED,
          listingType: 'rent',
        },
        0,
        limit
      );

      // Normalize and combine
      const normalizedProperties = properties.map((p) => this.normalizeProperty(p));
      const normalizedListings = listings.map((l) => this.normalizeListing(l));
      const normalizedRequirements = requirements.map((r) => this.normalizeRequirement(r));

      // Combine and sort by publishedAt
      const combined = [...normalizedProperties, ...normalizedListings, ...normalizedRequirements];
      combined.sort((a, b) => {
        const dateA = a.publishedAt || a.createdAt || new Date(0);
        const dateB = b.publishedAt || b.createdAt || new Date(0);
        return new Date(dateB) - new Date(dateA);
      });

      return combined.slice(0, limit);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all listings for sale (houses and requirements)
   */
  async getForSale(limit = 20, sort = 'newest') {
    try {
      const sortMap = {
        newest: { publishedAt: -1, createdAt: -1 },
        popular: { views: -1 },
        price_asc: { price: 1 },
        price_desc: { price: -1 },
      };

      // Fetch from Listing collection (HOUSE_SALE type)
      const { data: listings } = await listingRepository.search(
        {
          status: ListingStatus.APPROVED,
          listingType: ListingType.HOUSE_SALE,
        },
        sortMap[sort] || sortMap.newest,
        0,
        limit
      );

      // Fetch from Requirement collection (buy type)
      const { data: requirements } = await requirementRepository.findAll(
        {
          status: PropertyStatus.APPROVED,
          listingType: 'buy',
        },
        0,
        limit
      );

      // Normalize and combine
      const normalizedListings = listings.map((l) => this.normalizeListing(l));
      const normalizedRequirements = requirements.map((r) => this.normalizeRequirement(r));

      // Combine and sort by publishedAt
      const combined = [...normalizedListings, ...normalizedRequirements];
      combined.sort((a, b) => {
        const dateA = a.publishedAt || a.createdAt || new Date(0);
        const dateB = b.publishedAt || b.createdAt || new Date(0);
        return new Date(dateB) - new Date(dateA);
      });

      return combined.slice(0, limit);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all marketplace products
   */
  async getMarketplace(limit = 20, sort = 'newest') {
    try {
      const sortMap = {
        newest: { publishedAt: -1, createdAt: -1 },
        popular: { views: -1 },
        price_asc: { price: 1 },
        price_desc: { price: -1 },
      };

      // Fetch from Listing collection (PRODUCT_SALE type)
      const { data: listings } = await listingRepository.search(
        {
          status: ListingStatus.APPROVED,
          listingType: ListingType.PRODUCT_SALE,
        },
        sortMap[sort] || sortMap.newest,
        0,
        limit
      );

      return listings.map((l) => this.normalizeListing(l));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get featured listings across all categories
   */
  async getFeatured(limit = 10) {
    try {
      // Get top viewed/favorited from each category
      const forRent = await this.getForRent(Math.ceil(limit / 3), 'popular');
      const forSale = await this.getForSale(Math.ceil(limit / 3), 'popular');
      const marketplace = await this.getMarketplace(Math.ceil(limit / 3), 'popular');

      // Combine and shuffle for variety
      const combined = [...forRent, ...forSale, ...marketplace];
      return combined.slice(0, limit);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new UnifiedListingService();
