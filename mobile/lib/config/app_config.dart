class AppConfig {
  // For Android emulator use 10.0.2.2, for iOS simulator/physical device use your computer's IP
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:5000/api/v1',  // Android emulator
    // For iOS: use 'http://localhost:5000/api/v1'
    // For physical device: use 'http://YOUR_IP:5000/api/v1'
  );

  static const String appName = 'Semuni Delala';
  static const int defaultPageSize = 20;
}
