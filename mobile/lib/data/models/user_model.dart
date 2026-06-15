class UserModel {
  final String id;
  final String fullName;
  final String phoneNumber;
  final String? email;
  final String role;
  final String? profileImage;
  final bool isVerified;
  final String status;
  final String preferredLanguage;

  UserModel({
    required this.id,
    required this.fullName,
    required this.phoneNumber,
    this.email,
    required this.role,
    this.profileImage,
    required this.isVerified,
    required this.status,
    required this.preferredLanguage,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['_id'] as String? ?? json['id'] as String,
      fullName: json['fullName'] as String,
      phoneNumber: json['phoneNumber'] as String,
      email: json['email'] as String?,
      role: json['role'] as String,
      profileImage: json['profileImage'] as String?,
      isVerified: json['isVerified'] as bool? ?? false,
      status: json['status'] as String? ?? 'active',
      preferredLanguage: json['preferredLanguage'] as String? ?? 'en',
    );
  }

  bool get isAdmin => role == 'admin' || role == 'super_admin';
  bool get canPostListing =>
      role == 'user' ||
      role == 'owner' ||
      role == 'broker' ||
      role == 'admin' ||
      role == 'super_admin';
}
