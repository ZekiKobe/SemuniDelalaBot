import 'package:dio/dio.dart';
import '../../../core/constants/api_constants.dart';
import '../../models/requirement_model.dart';

class RequirementRemoteDataSource {
  final Dio _dio;

  RequirementRemoteDataSource(this._dio);

  Future<List<RequirementModel>> getPendingRequirements() async {
    final response = await _dio.get(
      ApiConstants.adminRequirements,
      queryParameters: {'status': 'pending_approval'},
    );
    final data = response.data['data'] as List<dynamic>;
    return data
        .map((e) => RequirementModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<RequirementModel> approveRequirement(String requirementId) async {
    final response = await _dio.put('${ApiConstants.adminApproveRequirement}/$requirementId/approve');
    return RequirementModel.fromJson(response.data['data'] as Map<String, dynamic>);
  }

  Future<RequirementModel> rejectRequirement(String requirementId, String rejectionReason) async {
    final response = await _dio.put(
      '${ApiConstants.adminRejectRequirement}/$requirementId/reject',
      data: {'rejectionReason': rejectionReason},
    );
    return RequirementModel.fromJson(response.data['data'] as Map<String, dynamic>);
  }
}
