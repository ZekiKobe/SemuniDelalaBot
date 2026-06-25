import '../../config/app_config.dart';

class ListingImage {
  final String id;
  final String url;
  final String? thumbnailUrl;
  final int order;

  ListingImage({
    required this.id,
    required this.url,
    this.thumbnailUrl,
    required this.order,
  });

  factory ListingImage.fromJson(Map<String, dynamic> json) {
    return ListingImage(
      id: json['_id'] as String? ?? '',
      url: _resolveUrl(json['url'] as String),
      thumbnailUrl: json['thumbnailUrl'] != null
          ? _resolveUrl(json['thumbnailUrl'] as String)
          : null,
      order: json['order'] as int? ?? 0,
    );
  }

  static String _resolveUrl(String path) {
    if (path.startsWith('http')) return path;
    final base = AppConfig.apiBaseUrl.replaceAll('/api/v1', '');
    return '$base$path';
  }
}

class ListingModel {
  final String id;
  final String title;
  final String description;
  final num price;
  final bool isNegotiable;
  final String? categoryId;
  final String? subcategoryId;
  final String? categoryName;
  final String? subcategoryName;
  final String listingType;
  final String? condition;
  final String? brand;
  final String status;
  final String contactPhone;
  final String? city;
  final String? subCity;
  final List<ListingImage> images;
  final String? primaryImage;
  final int views;
  final int favoritesCount;
  final bool isFavorite;
  final String? sellerId;
  final String? sellerName;
  final String? telegramUsername;
  final DateTime? createdAt;
  final DateTime? publishedAt;

  ListingModel({
    required this.id,
    required this.title,
    required this.description,
    required this.price,
    this.isNegotiable = false,
    this.categoryId,
    this.subcategoryId,
    this.categoryName,
    this.subcategoryName,
    required this.listingType,
    this.condition,
    this.brand,
    required this.status,
    required this.contactPhone,
    this.city,
    this.subCity,
    this.images = const [],
    this.primaryImage,
    this.views = 0,
    this.favoritesCount = 0,
    this.isFavorite = false,
    this.sellerId,
    this.sellerName,
    this.telegramUsername,
    this.createdAt,
    this.publishedAt,
  });

  factory ListingModel.fromJson(Map<String, dynamic> json) {
    final productDetails = json['productDetails'] as Map<String, dynamic>?;
    final location = json['location'] as Map<String, dynamic>?;
    final category = json['categoryId'] as Map<String, dynamic>?;
    final subcategory = json['subcategoryId'] as Map<String, dynamic>?;
    final seller = json['sellerId'] as Map<String, dynamic>?;
    
    final imagesList = (json['images'] as List<dynamic>?)
            ?.map((img) => ListingImage.fromJson(img as Map<String, dynamic>))
            .toList() ??
        [];

    String? primaryImageUrl;
    if (imagesList.isNotEmpty) {
      primaryImageUrl = imagesList.first.url;
    }

    return ListingModel(
      id: json['_id'] as String,
      title: json['title'] as String,
      description: json['description'] as String? ?? '',
      price: json['price'] as num,
      isNegotiable: json['isNegotiable'] as bool? ?? false,
      categoryId: category?['_id'] as String?,
      subcategoryId: subcategory?['_id'] as String?,
      categoryName: category?['name'] as String?,
      subcategoryName: subcategory?['name'] as String?,
      listingType: json['listingType'] as String? ?? 'product_sale',
      condition: productDetails?['condition'] as String?,
      brand: productDetails?['brand'] as String?,
      status: json['status'] as String,
      contactPhone: json['contactPhone'] as String,
      city: location?['city'] as String?,
      subCity: location?['subCity'] as String?,
      images: imagesList,
      primaryImage: primaryImageUrl,
      views: json['views'] as int? ?? 0,
      favoritesCount: json['favoritesCount'] as int? ?? 0,
      isFavorite: json['isFavorite'] as bool? ?? false,
      sellerId: seller?['_id'] as String? ?? json['sellerId'] as String?,
      sellerName: seller?['fullName'] as String?,
      telegramUsername: json['telegramUsername'] as String?,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : null,
      publishedAt: json['publishedAt'] != null
          ? DateTime.parse(json['publishedAt'] as String)
          : null,
    );
  }

  String get displayCondition {
    if (condition == null) return '';
    return condition!.split('_').map((word) {
      return word[0].toUpperCase() + word.substring(1).toLowerCase();
    }).join(' ');
  }

  String get displayLocation {
    if (city != null && subCity != null) {
      return '$subCity, $city';
    }
    return city ?? subCity ?? '';
  }

  String get priceDisplay {
    return '${price.toStringAsFixed(0)} ETB';
  }
}
