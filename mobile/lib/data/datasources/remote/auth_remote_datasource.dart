import 'package:dio/dio.dart';
import '../../../core/constants/api_constants.dart';
import '../../models/user_model.dart';

class AuthRemoteDataSource {
  final Dio _dio;

  AuthRemoteDataSource(this._dio);

  Future<Map<String, dynamic>> register(Map<String, dynamic> data) async {
    final response = await _dio.post(ApiConstants.authRegister, data: data);
    return response.data['data'] as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> login(String identifier, String password) async {
    final response = await _dio.post(
      ApiConstants.authLogin,
      data: {'identifier': identifier, 'password': password},
    );
    return response.data['data'] as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> loginWithTelegram(Map<String, dynamic> telegramData) async {
    final response = await _dio.post(
      ApiConstants.authLoginTelegram,
      data: telegramData,
    );
    return response.data['data'] as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> refresh(String refreshToken) async {
    final response = await _dio.post(
      ApiConstants.authRefresh,
      data: {'refreshToken': refreshToken},
    );
    return response.data['data'] as Map<String, dynamic>;
  }

  Future<void> logout(String? refreshToken) async {
    await _dio.post(ApiConstants.authLogout, data: {'refreshToken': refreshToken});
  }

  Future<UserModel> getMe() async {
    final response = await _dio.get(ApiConstants.authMe);
    return UserModel.fromJson(response.data['data'] as Map<String, dynamic>);
  }

  Future<UserModel> updateProfile(Map<String, dynamic> data) async {
    final response = await _dio.put(ApiConstants.authMe, data: data);
    return UserModel.fromJson(response.data['data'] as Map<String, dynamic>);
  }
}
