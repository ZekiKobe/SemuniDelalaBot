import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _localeKey = 'app_locale';
const supportedLocaleCodes = ['en', 'am', 'om'];

final sharedPreferencesProvider = Provider<SharedPreferences>((ref) {
  throw UnimplementedError('SharedPreferences must be overridden in main.dart');
});

class LocaleNotifier extends StateNotifier<Locale> {
  LocaleNotifier(this._prefs) : super(_resolveInitial(_prefs));

  final SharedPreferences _prefs;

  static Locale _resolveInitial(SharedPreferences prefs) {
    final saved = prefs.getString(_localeKey);
    if (saved != null && supportedLocaleCodes.contains(saved)) {
      return Locale(saved);
    }

    final deviceCode = PlatformDispatcher.instance.locale.languageCode;
    return Locale(supportedLocaleCodes.contains(deviceCode) ? deviceCode : 'en');
  }

  Future<void> setLocale(String languageCode) async {
    if (!supportedLocaleCodes.contains(languageCode)) return;
    state = Locale(languageCode);
    await _prefs.setString(_localeKey, languageCode);
  }

  Future<void> syncFromUser(String? preferredLanguage) async {
    if (preferredLanguage == null || !supportedLocaleCodes.contains(preferredLanguage)) {
      return;
    }
    await setLocale(preferredLanguage);
  }
}

final localeProvider = StateNotifierProvider<LocaleNotifier, Locale>((ref) {
  return LocaleNotifier(ref.watch(sharedPreferencesProvider));
});

String languageLabel(String code, BuildContext context) {
  switch (code) {
    case 'am':
      return 'አማርኛ';
    case 'om':
      return 'Afaan Oromoo';
    default:
      return 'English';
  }
}
