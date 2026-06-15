class PaymentModel {
  final String id;
  final String userId;
  final String propertyId;
  final num amount;
  final String currency;
  final String method;
  final String status;
  final String? transactionReference;
  final String? screenshotUrl;
  final DateTime? submittedAt;
  final DateTime? createdAt;

  PaymentModel({
    required this.id,
    required this.userId,
    required this.propertyId,
    required this.amount,
    required this.currency,
    required this.method,
    required this.status,
    this.transactionReference,
    this.screenshotUrl,
    this.submittedAt,
    this.createdAt,
  });

  factory PaymentModel.fromJson(Map<String, dynamic> json) {
    return PaymentModel(
      id: json['_id'] as String? ?? json['id'] as String,
      userId: json['userId'] is Map
          ? json['userId']['_id'] as String
          : json['userId'] as String,
      propertyId: json['propertyId'] is Map
          ? json['propertyId']['_id'] as String
          : json['propertyId'] as String,
      amount: json['amount'] as num,
      currency: json['currency'] as String? ?? 'ETB',
      method: json['method'] as String,
      status: json['status'] as String,
      transactionReference: json['transactionReference'] as String?,
      screenshotUrl: json['screenshotUrl'] as String?,
      submittedAt: json['submittedAt'] != null
          ? DateTime.parse(json['submittedAt'] as String)
          : null,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : null,
    );
  }
}

class PaymentInstructions {
  final num listingFeeEtb;
  final Map<String, String> telebirr;
  final Map<String, String> cbe;

  PaymentInstructions({
    required this.listingFeeEtb,
    required this.telebirr,
    required this.cbe,
  });

  factory PaymentInstructions.fromJson(Map<String, dynamic> json) {
    return PaymentInstructions(
      listingFeeEtb: json['listingFeeEtb'] as num? ?? 20,
      telebirr: Map<String, String>.from(json['telebirr'] as Map? ?? {}),
      cbe: Map<String, String>.from(json['cbe'] as Map? ?? {}),
    );
  }
}
