import 'package:dio/dio.dart';
import '../../../core/constants/api_constants.dart';
import '../../models/listing_model.dart';

class ListingRemoteDataSource {
  final Dio _dio;

  ListingRemoteDataSource(this._dio);

  Future<List<ListingModel>> getFeatured() async {
    final response = await _dio.get(ApiConstants.marketplaceListingsFeatured);
    final data = response.data['data'] as List<dynamic>;
    return data.map((json) => ListingModel.fromJson(json as Map<String, dynamic>)).toList();
  }

  Future<List<ListingModel>> getNew() async {
    final response = await _dio.get(ApiConstants.marketplaceListingsNew);
    final data = response.data['data'] as List<dynamic>;
    return data.map((json) => ListingModel.fromJson(json as Map<String, dynamic>)).toList();
  }

  Future<List<ListingModel>> getPopular() async {
    final response = await _dio.get(ApiConstants.marketplaceListingsPopular);
    final data = response.data['data'] as List<dynamic>;
    return data.map((json) => ListingModel.fromJson(json as Map<String, dynamic>)).toList();
  }

  Future<List<ListingModel>> search({
    String? search,
    String? categoryId,
    String? subcategoryId,
    num? minPrice,
    num? maxPrice,
    String? condition,
    String? city,
    String? subCity,
    String? sort,
    int page = 1,
    int limit = 20,
  }) async {
    final queryParams = <String, dynamic>{
      if (search != null) 'search': search,
      if (categoryId != null) 'categoryId': categoryId,
      if (subcategoryId != null) 'subcategoryId': subcategoryId,
      if (minPrice != null) 'minPrice': minPrice,
      if (maxPrice != null) 'maxPrice': maxPrice,
      if (condition != null) 'condition': condition,
      if (city != null) 'city': city,
      if (subCity != null) 'subCity': subCity,
      if (sort != null) 'sort': sort,
      'page': page,
      'limit': limit,
    };

    final response = await _dio.get(
      ApiConstants.marketplaceListings,
      queryParameters: queryParams,
    );

    final data = response.data['data'] as List<dynamic>;
    return data.map((json) => ListingModel.fromJson(json as Map<String, dynamic>)).toList();
  }

  Future<ListingModel> getById(String id) async {
    final response = await _dio.get('${ApiConstants.marketplaceListings}/$id');
    return ListingModel.fromJson(response.data['data'] as Map<String, dynamic>);
  }
}
