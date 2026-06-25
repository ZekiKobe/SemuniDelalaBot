import 'package:dio/dio.dart';
import '../../../core/constants/api_constants.dart';
import '../../models/unified_listing_model.dart';

class UnifiedListingRemoteDataSource {
  final Dio _dio;

  UnifiedListingRemoteDataSource(this._dio);

  Future<List<UnifiedListingModel>> getForRent({int limit = 20, String sort = 'newest'}) async {
    final response = await _dio.get(
      ApiConstants.unifiedForRent,
      queryParameters: {'limit': limit, 'sort': sort},
    );
    final data = response.data['data'] as List<dynamic>;
    return data.map((json) => UnifiedListingModel.fromJson(json as Map<String, dynamic>)).toList();
  }

  Future<List<UnifiedListingModel>> getForSale({int limit = 20, String sort = 'newest'}) async {
    final response = await _dio.get(
      ApiConstants.unifiedForSale,
      queryParameters: {'limit': limit, 'sort': sort},
    );
    final data = response.data['data'] as List<dynamic>;
    return data.map((json) => UnifiedListingModel.fromJson(json as Map<String, dynamic>)).toList();
  }

  Future<List<UnifiedListingModel>> getMarketplace({int limit = 20, String sort = 'newest'}) async {
    final response = await _dio.get(
      ApiConstants.unifiedMarketplace,
      queryParameters: {'limit': limit, 'sort': sort},
    );
    final data = response.data['data'] as List<dynamic>;
    return data.map((json) => UnifiedListingModel.fromJson(json as Map<String, dynamic>)).toList();
  }

  Future<List<UnifiedListingModel>> getFeatured({int limit = 10}) async {
    final response = await _dio.get(
      ApiConstants.unifiedFeatured,
      queryParameters: {'limit': limit},
    );
    final data = response.data['data'] as List<dynamic>;
    return data.map((json) => UnifiedListingModel.fromJson(json as Map<String, dynamic>)).toList();
  }
}
