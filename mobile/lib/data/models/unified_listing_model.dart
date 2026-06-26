import '../../config/app_config.dart';

enum ListingCategory { rent, sale, marketplace }

class UnifiedListingModel {
  final String id;
  final String title;
  final String description;
  final num price;
  final bool isNegotiable;
  final ListingCategory category;
  final String? propertyType;
  final String? productCategory;
  final String? productSubcategory;
  final String? condition;
  final String? brand;
  final String? model;
  final List<UnifiedListingImage> images;
  final String? primaryImage;
  final UnifiedListingLocation location;
  final String contactPhone;
  final int? bedrooms;
  final int? bathrooms;
  final num? area;
  final bool? furnished;
  final bool? parking;
  final int views;
  final int favoritesCount;
  final bool isFavorite;
  final bool fromTelegram;
  final String? telegramUsername;
  final String status;
  final String source;
  final bool isRequirement;
  final DateTime? createdAt;
  final DateTime? publishedAt;

  UnifiedListingModel({
    required this.id,
    required this.title,
    required this.description,
    required this.price,
    this.isNegotiable = false,
    required this.category,
    this.propertyType,
    this.productCategory,
    this.productSubcategory,
    this.condition,
    this.brand,
    this.model,
    this.images = const [],
    this.primaryImage,
    required this.location,
    required this.contactPhone,
    this.bedrooms,
    this.bathrooms,
    this.area,
    this.furnished,
    this.parking,
    this.views = 0,
    this.favoritesCount = 0,
    this.isFavorite = false,
    this.fromTelegram = false,
    this.telegramUsername,
    required this.status,
    required this.source,
    this.isRequirement = false,
    this.createdAt,
    this.publishedAt,
  });

  factory UnifiedListingModel.fromJson(Map<String, dynamic> json) {
    try {
      ListingCategory category;
      final categoryStr = json['category'] as String?;
      switch (categoryStr) {
        case 'rent':
          category = ListingCategory.rent;
          break;
        case 'sale':
          category = ListingCategory.sale;
          break;
        case 'marketplace':
          category = ListingCategory.marketplace;
          break;
        default:
          category = ListingCategory.marketplace;
      }

      final imagesList = (json['images'] as List<dynamic>?)
              ?.map((img) {
                try {
                  return UnifiedListingImage.fromJson(img as Map<String, dynamic>);
                } catch (e) {
                  return null;
                }
              })
              .whereType<UnifiedListingImage>()
              .toList() ??
          [];

      final rawPrimaryImage = json['primaryImage']?.toString();
      final resolvedPrimaryImage = rawPrimaryImage != null && rawPrimaryImage.isNotEmpty
          ? UnifiedListingImage.resolveUrl(rawPrimaryImage)
          : (imagesList.isNotEmpty
              ? (imagesList.first.thumbnailUrl ?? imagesList.first.url)
              : null);

      return UnifiedListingModel(
        id: json['id']?.toString() ?? '',
        title: json['title']?.toString() ?? '',
        description: json['description']?.toString() ?? '',
        price: (json['price'] as num?) ?? 0,
        isNegotiable: (json['isNegotiable'] as bool?) ?? false,
        category: category,
        propertyType: json['propertyType']?.toString(),
        productCategory: json['productCategory']?.toString(),
        productSubcategory: json['productSubcategory']?.toString(),
        condition: json['condition']?.toString(),
        brand: json['brand']?.toString(),
        model: json['model']?.toString(),
        images: imagesList,
        primaryImage: resolvedPrimaryImage,
        location: UnifiedListingLocation.fromJson(
          (json['location'] as Map<String, dynamic>?) ?? {},
        ),
        contactPhone: json['contactPhone']?.toString() ?? '',
        bedrooms: json['bedrooms'] as int?,
        bathrooms: json['bathrooms'] as int?,
        area: json['area'] as num?,
        furnished: json['furnished'] as bool?,
        parking: json['parking'] as bool?,
        views: (json['views'] as int?) ?? 0,
        favoritesCount: (json['favoritesCount'] as int?) ?? 0,
        isFavorite: (json['isFavorite'] as bool?) ?? false,
        fromTelegram: (json['fromTelegram'] as bool?) ?? false,
        telegramUsername: json['telegramUsername']?.toString(),
        status: json['status']?.toString() ?? 'approved',
        source: json['source']?.toString() ?? 'listing',
        isRequirement: (json['isRequirement'] as bool?) ?? false,
        createdAt: json['createdAt'] != null 
          ? DateTime.tryParse(json['createdAt'].toString()) 
          : null,
        publishedAt: json['publishedAt'] != null 
          ? DateTime.tryParse(json['publishedAt'].toString()) 
          : null,
      );
    } catch (e) {
      print('Error parsing UnifiedListingModel: $e');
      print('JSON data: $json');
      rethrow;
    }
  }

  String get priceDisplay {
    return '${price.toStringAsFixed(0)} ETB';
  }

  String get displayCondition {
    if (condition == null) return '';
    return condition!.split('_').map((word) {
      return word[0].toUpperCase() + word.substring(1).toLowerCase();
    }).join(' ');
  }

  String get categoryLabel {
    switch (category) {
      case ListingCategory.rent:
        return 'For Rent';
      case ListingCategory.sale:
        return 'For Sale';
      case ListingCategory.marketplace:
        return 'Marketplace';
    }
  }

  String get typeLabel {
    if (category == ListingCategory.marketplace && productCategory != null) {
      return productCategory!;
    }
    if (propertyType != null) {
      return propertyType!.split('_').map((word) {
        return word[0].toUpperCase() + word.substring(1).toLowerCase();
      }).join(' ');
    }
    return categoryLabel;
  }
}

class UnifiedListingImage {
  final String id;
  final String url;
  final String? thumbnailUrl;
  final int order;

  UnifiedListingImage({
    required this.id,
    required this.url,
    this.thumbnailUrl,
    required this.order,
  });

  factory UnifiedListingImage.fromJson(Map<String, dynamic> json) {
    final urlStr = json['url']?.toString() ?? '';
    final thumbnailStr = json['thumbnailUrl']?.toString();
    
    return UnifiedListingImage(
      id: json['_id']?.toString() ?? '',
      url: resolveUrl(urlStr),
      thumbnailUrl: thumbnailStr != null ? resolveUrl(thumbnailStr) : null,
      order: (json['order'] as int?) ?? 0,
    );
  }

  static String resolveUrl(String path) {
    if (path.isEmpty) return '';
    if (path.startsWith('http')) return path;
    final base = AppConfig.apiBaseUrl.replaceAll('/api/v1', '');
    return '$base$path';
  }
}

class UnifiedListingLocation {
  final String? city;
  final String? subCity;
  final String? region;
  final String? area;
  final String full;

  UnifiedListingLocation({
    this.city,
    this.subCity,
    this.region,
    this.area,
    required this.full,
  });

  factory UnifiedListingLocation.fromJson(Map<String, dynamic> json) {
    return UnifiedListingLocation(
      city: json['city']?.toString(),
      subCity: json['subCity']?.toString(),
      region: json['region']?.toString(),
      area: json['area']?.toString(),
      full: json['full']?.toString() ?? '',
    );
  }
}
