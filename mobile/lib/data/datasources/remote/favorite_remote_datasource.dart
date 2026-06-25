import 'package:dio/dio.dart';
import '../../../core/constants/api_constants.dart';
import '../../models/property_model.dart';
import '../../models/unified_listing_model.dart';

class FavoriteRemoteDataSource {
  final Dio _dio;

  FavoriteRemoteDataSource(this._dio);

  Future<void> add(String listingId) async {
    final response = await _dio.post(
      ApiConstants.favorites,
      data: {'propertyId': listingId},
    );
    if (response.statusCode != 201 && response.statusCode != 200) {
      throw Exception('Failed to add favorite');
    }
  }

  Future<void> remove(String listingId) async {
    final response = await _dio.delete('${ApiConstants.favorites}/$listingId');
    if (response.statusCode != 200) {
      throw Exception('Failed to remove favorite');
    }
  }

  Future<List<PropertyModel>> getAll() async {
    final response = await _dio.get(ApiConstants.favorites);
    final data = response.data['data'] as List<dynamic>;
    return data
        .where((e) => e['propertyId'] != null)
        .map((e) => PropertyModel.fromJson(e['propertyId'] as Map<String, dynamic>))
        .toList();
  }

  Future<List<UnifiedListingModel>> getAllUnified() async {
    try {
      final response = await _dio.get(ApiConstants.favorites);
      final data = response.data['data'] as List<dynamic>;
      return data
          .where((e) => e['propertyId'] != null)
          .map((e) => UnifiedListingModel.fromJson(e['propertyId'] as Map<String, dynamic>))
          .toList();
    } catch (e) {
      return [];
    }
  }

  Future<bool> check(String listingId) async {
    try {
      final response = await _dio.get('${ApiConstants.favorites}/check/$listingId');
      return response.data['data']['isFavorited'] as bool? ?? false;
    } catch (e) {
      return false;
    }
  }
}
