import 'package:intl/intl.dart';

String formatPrice(num price) {
  return '${NumberFormat('#,###').format(price)} ETB';
}

String formatDate(DateTime date) {
  return DateFormat('dd MMM yyyy').format(date);
}
