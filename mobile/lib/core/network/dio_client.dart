import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../config/app_config.dart';
import '../storage/secure_storage.dart';
import 'auth_interceptor.dart';

final secureStorageProvider = Provider<SecureStorage>((ref) => SecureStorage());

final dioProvider = Provider<Dio>((ref) {
  final storage = ref.watch(secureStorageProvider);
  final dio = Dio(
    BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
    ),
  );

  dio.interceptors.add(AuthInterceptor(storage, dio));
  dio.interceptors.add(LogInterceptor(requestBody: true, responseBody: true));

  return dio;
});
