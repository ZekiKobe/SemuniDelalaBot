import 'package:dio/dio.dart';
import '../../../core/constants/api_constants.dart';
import '../../models/payment_model.dart';

class PaymentRemoteDataSource {
  final Dio _dio;

  PaymentRemoteDataSource(this._dio);

  Future<PaymentInstructions> getInstructions() async {
    final response = await _dio.get(ApiConstants.paymentsInstructions);
    return PaymentInstructions.fromJson(response.data['data'] as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> create(String propertyId, String method) async {
    final response = await _dio.post(
      ApiConstants.paymentsCreate,
      data: {'propertyId': propertyId, 'method': method},
    );
    return response.data['data'] as Map<String, dynamic>;
  }

  Future<PaymentModel> submit(
    String paymentId,
    String transactionReference,
    MultipartFile? screenshot,
  ) async {
    final formData = FormData.fromMap({
      'transactionReference': transactionReference,
      if (screenshot != null) 'screenshot': screenshot,
    });

    final response = await _dio.post(
      '/payments/$paymentId/submit',
      data: formData,
    );
    return PaymentModel.fromJson(response.data['data'] as Map<String, dynamic>);
  }

  Future<List<PaymentModel>> getHistory() async {
    final response = await _dio.get(ApiConstants.paymentsHistory);
    final data = response.data['data'] as List<dynamic>;
    return data.map((e) => PaymentModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Map<String, dynamic>> approvePayment(String paymentId) async {
    final response = await _dio.put('${ApiConstants.adminApprovePayment}/$paymentId/approve');
    return response.data['data'] as Map<String, dynamic>;
  }

  Future<PaymentModel> rejectPayment(String paymentId, String rejectionReason, String? adminNotes) async {
    final response = await _dio.put(
      '${ApiConstants.adminRejectPayment}/$paymentId/reject',
      data: {
        'rejectionReason': rejectionReason,
        if (adminNotes != null) 'adminNotes': adminNotes,
      },
    );
    return PaymentModel.fromJson(response.data['data'] as Map<String, dynamic>);
  }

  Future<List<PaymentModel>> getPendingPayments() async {
    final response = await _dio.get(ApiConstants.adminPayments, queryParameters: {'status': 'submitted'});
    final data = response.data['data'] as List<dynamic>;
    return data.map((e) => PaymentModel.fromJson(e as Map<String, dynamic>)).toList();
  }
}
