import 'package:dio/dio.dart';
import '../storage/secure_storage.dart';

class AuthInterceptor extends Interceptor {
  final SecureStorage _storage;
  final Dio _dio;
  bool _isRefreshing = false;

  AuthInterceptor(this._storage, this._dio);

  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await _storage.getAccessToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401 && !_isRefreshing) {
      _isRefreshing = true;
      try {
        final refreshToken = await _storage.getRefreshToken();
        if (refreshToken != null) {
          final response = await _dio.post(
            '/auth/refresh',
            data: {'refreshToken': refreshToken},
          );

          final newAccess = response.data['data']['accessToken'] as String;
          final newRefresh = response.data['data']['refreshToken'] as String;
          await _storage.saveTokens(
            accessToken: newAccess,
            refreshToken: newRefresh,
          );

          err.requestOptions.headers['Authorization'] = 'Bearer $newAccess';
          final retryResponse = await _dio.fetch(err.requestOptions);
          _isRefreshing = false;
          return handler.resolve(retryResponse);
        }
      } catch (_) {
        await _storage.clearTokens();
      }
      _isRefreshing = false;
    }
    handler.next(err);
  }
}
