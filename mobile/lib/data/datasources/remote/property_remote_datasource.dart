import 'package:dio/dio.dart';
import '../../../core/constants/api_constants.dart';
import '../../models/property_model.dart';

class PropertyRemoteDataSource {
  final Dio _dio;

  PropertyRemoteDataSource(this._dio);

  Future<List<PropertyModel>> getList(Map<String, dynamic> query) async {
    final response = await _dio.get(ApiConstants.properties, queryParameters: query);
    final data = response.data['data'] as List<dynamic>;
    return data.map((e) => PropertyModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<PropertyModel>> getFeatured() async {
    final response = await _dio.get(ApiConstants.propertiesFeatured);
    return _parseList(response.data['data']);
  }

  Future<List<PropertyModel>> getNew() async {
    final response = await _dio.get(ApiConstants.propertiesNew);
    return _parseList(response.data['data']);
  }

  Future<List<PropertyModel>> getPopular() async {
    final response = await _dio.get(ApiConstants.propertiesPopular);
    return _parseList(response.data['data']);
  }

  Future<List<PopularArea>> getAreas() async {
    final response = await _dio.get(ApiConstants.propertiesAreas);
    final data = response.data['data'] as List<dynamic>;
    return data.map((e) => PopularArea.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<PropertyModel> getById(String id) async {
    final response = await _dio.get('${ApiConstants.properties}/$id');
    return PropertyModel.fromJson(response.data['data'] as Map<String, dynamic>);
  }

  Future<List<PropertyModel>> getRelated(String id) async {
    final response = await _dio.get('${ApiConstants.properties}/$id/related');
    return _parseList(response.data['data']);
  }

  Future<PropertyModel> create(Map<String, dynamic> data) async {
    final response = await _dio.post(ApiConstants.properties, data: data);
    return PropertyModel.fromJson(response.data['data'] as Map<String, dynamic>);
  }

  Future<PropertyModel> update(String id, Map<String, dynamic> data) async {
    final response = await _dio.put('${ApiConstants.properties}/$id', data: data);
    return PropertyModel.fromJson(response.data['data'] as Map<String, dynamic>);
  }

  Future<PropertyModel> submit(String id) async {
    final response = await _dio.post('${ApiConstants.properties}/$id/submit');
    return PropertyModel.fromJson(response.data['data'] as Map<String, dynamic>);
  }

  Future<List<PropertyModel>> getMyListings({String? status}) async {
    final response = await _dio.get(
      ApiConstants.propertiesMy,
      queryParameters: status != null ? {'status': status} : null,
    );
    return _parseList(response.data['data']);
  }

  Future<List<PropertyModel>> getPendingTelegramListings() async {
    final response = await _dio.get(
      ApiConstants.adminProperties,
      queryParameters: {
        'status': 'pending_approval',
        'source': 'telegram',
      },
    );
    return _parseList(response.data['data']);
  }

  Future<PropertyModel> approveProperty(String propertyId) async {
    final response = await _dio.put('${ApiConstants.adminApproveProperty}/$propertyId/approve');
    return PropertyModel.fromJson(response.data['data'] as Map<String, dynamic>);
  }

  Future<PropertyModel> rejectProperty(String propertyId, String rejectionReason) async {
    final response = await _dio.put(
      '${ApiConstants.adminRejectProperty}/$propertyId/reject',
      data: {'rejectionReason': rejectionReason},
    );
    return PropertyModel.fromJson(response.data['data'] as Map<String, dynamic>);
  }

  Future<PropertyModel> uploadImages(String id, List<MultipartFile> files) async {
    final formData = FormData.fromMap({
      'images': files,
    });
    final response = await _dio.post(
      '${ApiConstants.properties}/$id/images',
      data: formData,
    );
    return PropertyModel.fromJson(response.data['data'] as Map<String, dynamic>);
  }

  List<PropertyModel> _parseList(dynamic data) {
    return (data as List<dynamic>)
        .map((e) => PropertyModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
