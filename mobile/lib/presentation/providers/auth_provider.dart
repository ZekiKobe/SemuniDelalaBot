import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/dio_client.dart';
import '../../core/storage/secure_storage.dart';
import '../../core/utils/phone_validator.dart';
import '../../data/datasources/remote/auth_remote_datasource.dart';
import '../../data/models/user_model.dart';
import 'locale_provider.dart';

final authRemoteProvider = Provider<AuthRemoteDataSource>((ref) {
  return AuthRemoteDataSource(ref.watch(dioProvider));
});

class AuthState {
  final UserModel? user;
  final bool isLoading;
  final bool isAuthenticated;
  final String? error;

  const AuthState({
    this.user,
    this.isLoading = false,
    this.isAuthenticated = false,
    this.error,
  });

  AuthState copyWith({
    UserModel? user,
    bool? isLoading,
    bool? isAuthenticated,
    String? error,
  }) {
    return AuthState(
      user: user ?? this.user,
      isLoading: isLoading ?? this.isLoading,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      error: error,
    );
  }
}

String _parseError(dynamic e) {
  if (e is DioException) {
    final data = e.response?.data;
    if (data is Map && data['error'] is Map) {
      return data['error']['message'] as String? ?? 'Request failed';
    }
  }
  return 'Something went wrong. Please try again.';
}

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRemoteDataSource _authRemote;
  final SecureStorage _storage;
  final Ref _ref;

  AuthNotifier(this._authRemote, this._storage, this._ref) : super(const AuthState()) {
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    final token = await _storage.getAccessToken();
    if (token == null) return;

    try {
      final user = await _authRemote.getMe();
      state = state.copyWith(user: user, isAuthenticated: true);
      await _ref.read(localeProvider.notifier).syncFromUser(user.preferredLanguage);
    } catch (_) {
      await _storage.clearTokens();
    }
  }

  Future<bool> login(String identifier, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final result = await _authRemote.login(identifier, password);
      await _storage.saveTokens(
        accessToken: result['accessToken'] as String,
        refreshToken: result['refreshToken'] as String,
      );
      final user = UserModel.fromJson(result['user'] as Map<String, dynamic>);
      state = state.copyWith(
        user: user,
        isAuthenticated: true,
        isLoading: false,
      );
      await _ref.read(localeProvider.notifier).syncFromUser(user.preferredLanguage);
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: _parseError(e),
      );
      return false;
    }
  }

  Future<bool> loginWithTelegram() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      // TODO: Implement actual Telegram authentication flow
      // For now, this is a placeholder that would normally:
      // 1. Open Telegram bot or web login
      // 2. Get auth data from Telegram
      // 3. Send to backend for verification
      
      // Placeholder telegram data - in production this would come from Telegram SDK
      final telegramData = {
        'id': 'telegram_user_id',
        'first_name': 'User',
        'username': 'telegram_username',
        'auth_date': DateTime.now().millisecondsSinceEpoch ~/ 1000,
        'hash': 'telegram_hash',
      };
      
      final result = await _authRemote.loginWithTelegram(telegramData);
      await _storage.saveTokens(
        accessToken: result['accessToken'] as String,
        refreshToken: result['refreshToken'] as String,
      );
      final user = UserModel.fromJson(result['user'] as Map<String, dynamic>);
      state = state.copyWith(
        user: user,
        isAuthenticated: true,
        isLoading: false,
      );
      await _ref.read(localeProvider.notifier).syncFromUser(user.preferredLanguage);
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: _parseError(e),
      );
      return false;
    }
  }

  Future<bool> register({
    required String fullName,
    required String phoneNumber,
    String? email,
    required String password,
    String? preferredLanguage,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final normalized = normalizeEthiopianPhone(phoneNumber);
      final localeCode = preferredLanguage ?? _ref.read(localeProvider).languageCode;
      final result = await _authRemote.register({
        'fullName': fullName,
        'phoneNumber': normalized,
        if (email != null && email.isNotEmpty) 'email': email,
        'password': password,
        'preferredLanguage': localeCode,
      });
      await _storage.saveTokens(
        accessToken: result['accessToken'] as String,
        refreshToken: result['refreshToken'] as String,
      );
      final user = UserModel.fromJson(result['user'] as Map<String, dynamic>);
      state = state.copyWith(
        user: user,
        isAuthenticated: true,
        isLoading: false,
      );
      await _ref.read(localeProvider.notifier).syncFromUser(user.preferredLanguage);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: _parseError(e));
      return false;
    }
  }

  Future<bool> updatePreferredLanguage(String languageCode) async {
    try {
      final user = await _authRemote.updateProfile({'preferredLanguage': languageCode});
      state = state.copyWith(user: user);
      await _ref.read(localeProvider.notifier).setLocale(languageCode);
      return true;
    } catch (e) {
      state = state.copyWith(error: _parseError(e));
      return false;
    }
  }

  Future<void> logout() async {
    final refreshToken = await _storage.getRefreshToken();
    try {
      await _authRemote.logout(refreshToken);
    } catch (_) {}
    await _storage.clearTokens();
    state = const AuthState();
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(
    ref.watch(authRemoteProvider),
    ref.watch(secureStorageProvider),
    ref,
  );
});
