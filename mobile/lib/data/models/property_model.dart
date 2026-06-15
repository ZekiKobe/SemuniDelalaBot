import '../../config/app_config.dart';
import '../../domain/enums/property_type.dart';

class PropertyImage {
  final String id;
  final String url;
  final String? thumbnailUrl;
  final int order;

  PropertyImage({
    required this.id,
    required this.url,
    this.thumbnailUrl,
    required this.order,
  });

  factory PropertyImage.fromJson(Map<String, dynamic> json) {
    return PropertyImage(
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

class PropertyModel {
  final String id;
  final String title;
  final String description;
  final String propertyType;
  final num rentPrice;
  final num depositAmount;
  final bool isNegotiable;
  final String region;
  final String city;
  final String subCity;
  final String? woreda;
  final String? kebele;
  final String? landmark;
  final double? latitude;
  final double? longitude;
  final String? googleMapsLink;
  final int bedrooms;
  final int bathrooms;
  final int kitchens;
  final int livingRooms;
  final bool parking;
  final bool balcony;
  final bool garden;
  final bool fence;
  final bool waterAvailable;
  final bool electricityAvailable;
  final bool internetAvailable;
  final bool furnished;
  final bool petsAllowed;
  final bool securityGuard;
  final bool cctv;
  final bool generator;
  final List<PropertyImage> images;
  final String contactPhone;
  final String? telegramUsername;
  final String status;
  final int views;
  final int favoritesCount;
  final String? slug;
  final String? createdBy;
  final DateTime? publishedAt;
  final DateTime? createdAt;

  PropertyModel({
    required this.id,
    required this.title,
    required this.description,
    required this.propertyType,
    required this.rentPrice,
    this.depositAmount = 0,
    this.isNegotiable = false,
    required this.region,
    required this.city,
    required this.subCity,
    this.woreda,
    this.kebele,
    this.landmark,
    this.latitude,
    this.longitude,
    this.googleMapsLink,
    this.bedrooms = 0,
    this.bathrooms = 0,
    this.kitchens = 0,
    this.livingRooms = 0,
    this.parking = false,
    this.balcony = false,
    this.garden = false,
    this.fence = false,
    this.waterAvailable = true,
    this.electricityAvailable = true,
    this.internetAvailable = false,
    this.furnished = false,
    this.petsAllowed = false,
    this.securityGuard = false,
    this.cctv = false,
    this.generator = false,
    this.images = const [],
    required this.contactPhone,
    this.telegramUsername,
    this.status = 'draft',
    this.views = 0,
    this.favoritesCount = 0,
    this.slug,
    this.createdBy,
    this.publishedAt,
    this.createdAt,
  });

  factory PropertyModel.fromJson(Map<String, dynamic> json) {
    return PropertyModel(
      id: json['_id'] as String? ?? json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String? ?? '',
      propertyType: json['propertyType'] as String,
      rentPrice: json['rentPrice'] as num,
      depositAmount: json['depositAmount'] as num? ?? 0,
      isNegotiable: json['isNegotiable'] as bool? ?? false,
      region: json['region'] as String,
      city: json['city'] as String,
      subCity: json['subCity'] as String,
      woreda: json['woreda'] as String?,
      kebele: json['kebele'] as String?,
      landmark: json['landmark'] as String?,
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      googleMapsLink: json['googleMapsLink'] as String?,
      bedrooms: json['bedrooms'] as int? ?? 0,
      bathrooms: json['bathrooms'] as int? ?? 0,
      kitchens: json['kitchens'] as int? ?? 0,
      livingRooms: json['livingRooms'] as int? ?? 0,
      parking: json['parking'] as bool? ?? false,
      balcony: json['balcony'] as bool? ?? false,
      garden: json['garden'] as bool? ?? false,
      fence: json['fence'] as bool? ?? false,
      waterAvailable: json['waterAvailable'] as bool? ?? true,
      electricityAvailable: json['electricityAvailable'] as bool? ?? true,
      internetAvailable: json['internetAvailable'] as bool? ?? false,
      furnished: json['furnished'] as bool? ?? false,
      petsAllowed: json['petsAllowed'] as bool? ?? false,
      securityGuard: json['securityGuard'] as bool? ?? false,
      cctv: json['cctv'] as bool? ?? false,
      generator: json['generator'] as bool? ?? false,
      images: (json['images'] as List<dynamic>?)
              ?.map((e) => PropertyImage.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      contactPhone: json['contactPhone'] as String? ?? '',
      telegramUsername: json['telegramUsername'] as String?,
      status: json['status'] as String? ?? 'draft',
      views: json['views'] as int? ?? 0,
      favoritesCount: json['favoritesCount'] as int? ?? 0,
      slug: json['slug'] as String?,
      createdBy: json['createdBy'] is Map
          ? json['createdBy']['_id'] as String?
          : json['createdBy'] as String?,
      publishedAt: json['publishedAt'] != null
          ? DateTime.parse(json['publishedAt'] as String)
          : null,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toCreateJson() => {
        'title': title,
        'description': description,
        'propertyType': propertyType,
        'rentPrice': rentPrice,
        'depositAmount': depositAmount,
        'isNegotiable': isNegotiable,
        'region': region,
        'city': city,
        'subCity': subCity,
        if (woreda != null) 'woreda': woreda,
        if (kebele != null) 'kebele': kebele,
        if (landmark != null) 'landmark': landmark,
        if (latitude != null) 'latitude': latitude,
        if (longitude != null) 'longitude': longitude,
        if (googleMapsLink != null) 'googleMapsLink': googleMapsLink,
        'bedrooms': bedrooms,
        'bathrooms': bathrooms,
        'kitchens': kitchens,
        'livingRooms': livingRooms,
        'parking': parking,
        'balcony': balcony,
        'garden': garden,
        'fence': fence,
        'waterAvailable': waterAvailable,
        'electricityAvailable': electricityAvailable,
        'internetAvailable': internetAvailable,
        'furnished': furnished,
        'petsAllowed': petsAllowed,
        'securityGuard': securityGuard,
        'cctv': cctv,
        'generator': generator,
        'contactPhone': contactPhone,
        if (telegramUsername != null) 'telegramUsername': telegramUsername,
      };

  PropertyType get type => PropertyType.fromApi(propertyType);
  String? get primaryImage =>
      images.isNotEmpty ? (images.first.thumbnailUrl ?? images.first.url) : null;
}

class PopularArea {
  final String name;
  final String city;
  final int count;
  final num avgPrice;

  PopularArea({
    required this.name,
    required this.city,
    required this.count,
    required this.avgPrice,
  });

  factory PopularArea.fromJson(Map<String, dynamic> json) {
    return PopularArea(
      name: json['name'] as String,
      city: json['city'] as String? ?? 'Addis Ababa',
      count: json['count'] as int? ?? 0,
      avgPrice: json['avgPrice'] as num? ?? 0,
    );
  }
}
