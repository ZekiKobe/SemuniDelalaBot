import 'package:dio/dio.dart';
import '../../../core/constants/api_constants.dart';
import '../../models/property_model.dart';

class FavoriteRemoteDataSource {
  final Dio _dio;

  FavoriteRemoteDataSource(this._dio);

  Future<void> add(String propertyId) async {
    await _dio.post(ApiConstants.favorites, data: {'propertyId': propertyId});
  }

  Future<void> remove(String propertyId) async {
    await _dio.delete('${ApiConstants.favorites}/$propertyId');
  }

  Future<List<PropertyModel>> getAll() async {
    final response = await _dio.get(ApiConstants.favorites);
    final data = response.data['data'] as List<dynamic>;
    return data
        .where((e) => e['propertyId'] != null)
        .map((e) => PropertyModel.fromJson(e['propertyId'] as Map<String, dynamic>))
        .toList();
  }

  Future<bool> check(String propertyId) async {
    final response = await _dio.get('${ApiConstants.favorites}/check/$propertyId');
    return response.data['data']['isFavorited'] as bool? ?? false;
  }
}
