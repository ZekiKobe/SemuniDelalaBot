class ApiConstants {
  static const String authRegister = '/auth/register';
  static const String authLogin = '/auth/login';
  static const String authLoginTelegram = '/auth/telegram';
  static const String authRefresh = '/auth/refresh';
  static const String authLogout = '/auth/logout';
  static const String authMe = '/auth/me';
  static const String authFcmToken = '/auth/me/fcm-token';

  static const String properties = '/properties';
  static const String propertiesFeatured = '/properties/featured';
  static const String propertiesNew = '/properties/new';
  static const String propertiesPopular = '/properties/popular';
  static const String propertiesAreas = '/properties/areas';
  static const String propertiesMy = '/properties/my/listings';

  static const String paymentsCreate = '/payments/create';
  static const String paymentsInstructions = '/payments/instructions';
  static const String paymentsHistory = '/payments/history';

  static const String marketplaceListings = '/marketplace/listings';
  static const String marketplaceListingsFeatured = '/marketplace/listings/featured';
  static const String marketplaceListingsNew = '/marketplace/listings/new';
  static const String marketplaceListingsPopular = '/marketplace/listings/popular';

  static const String unifiedForRent = '/unified/listings/for-rent';
  static const String unifiedForSale = '/unified/listings/for-sale';
  static const String unifiedMarketplace = '/unified/listings/marketplace';
  static const String unifiedFeatured = '/unified/listings/featured';

  static const String favorites = '/favorites';
  static const String reports = '/reports';
  static const String notifications = '/notifications';

  static const String adminDashboard = '/admin/dashboard';
  static const String adminUsers = '/admin/users';
  static const String adminProperties = '/admin/properties';
  static const String adminApproveProperty = '/admin/properties';
  static const String adminRejectProperty = '/admin/properties';
  static const String adminPayments = '/admin/payments';
  static const String adminApprovePayment = '/admin/payments';
  static const String adminRejectPayment = '/admin/payments';
  static const String adminRequirements = '/admin/requirements';
  static const String adminApproveRequirement = '/admin/requirements';
  static const String adminRejectRequirement = '/admin/requirements';
  static const String adminReports = '/admin/reports';
  static const String adminTelegramPosts = '/admin/telegram/posts';
}
