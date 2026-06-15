String? normalizeEthiopianPhone(String phone) {
  final cleaned = phone.replaceAll(RegExp(r'[\s\-()]'), '');

  if (RegExp(r'^\+2519\d{8}$').hasMatch(cleaned)) return cleaned;
  if (RegExp(r'^09\d{8}$').hasMatch(cleaned)) return '+251${cleaned.substring(1)}';
  if (RegExp(r'^9\d{8}$').hasMatch(cleaned)) return '+251$cleaned';

  return null;
}

bool isValidEthiopianPhone(String phone) => normalizeEthiopianPhone(phone) != null;
