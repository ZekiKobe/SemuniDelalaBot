class RequirementModel {
  final String id;
  final String title;
  final String description;
  final num budget;
  final String location;
  final String listingType;
  final String contactPhone;
  final String status;
  final String? rejectionReason;
  final String? paymentProofUrl;
  final DateTime? createdAt;
  final Map<String, dynamic>? createdBy;

  RequirementModel({
    required this.id,
    required this.title,
    required this.description,
    required this.budget,
    required this.location,
    required this.listingType,
    required this.contactPhone,
    required this.status,
    this.rejectionReason,
    this.paymentProofUrl,
    this.createdAt,
    this.createdBy,
  });

  factory RequirementModel.fromJson(Map<String, dynamic> json) {
    final paymentProof = json['paymentProof'] as Map<String, dynamic>?;
    final paymentProofUrl = paymentProof?['downloadUrl'] as String? ?? paymentProof?['filePath'] as String?;

    return RequirementModel(
      id: json['_id'] as String? ?? json['id'] as String,
      title: json['title'] as String? ?? '',
      description: json['description'] as String? ?? '',
      budget: json['budget'] as num? ?? 0,
      location: json['location'] as String? ?? '',
      listingType: json['listingType'] as String? ?? 'rent',
      contactPhone: json['contactPhone'] as String? ?? '',
      status: json['status'] as String? ?? 'pending_approval',
      rejectionReason: json['rejectionReason'] as String?,
      paymentProofUrl: paymentProofUrl,
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt'] as String) : null,
      createdBy: json['createdBy'] is Map<String, dynamic> ? Map<String, dynamic>.from(json['createdBy'] as Map<String, dynamic>) : null,
    );
  }

  String get typeLabel => listingType == 'buy' ? 'Looking to Buy' : 'Looking to Rent';
}
