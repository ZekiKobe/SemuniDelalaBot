import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_decorations.dart';
import '../../../core/utils/image_utils.dart';
import '../../../core/network/dio_client.dart';
import '../../../data/datasources/remote/payment_remote_datasource.dart';
import '../../../data/models/payment_model.dart';
import '../../widgets/delala_button.dart';

final paymentRemoteProvider = Provider<PaymentRemoteDataSource>((ref) {
  return PaymentRemoteDataSource(ref.watch(dioProvider));
});

class PaymentScreen extends ConsumerStatefulWidget {
  final String propertyId;

  const PaymentScreen({super.key, required this.propertyId});

  @override
  ConsumerState<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends ConsumerState<PaymentScreen> {
  PaymentInstructions? _instructions;
  String _method = 'telebirr';
  final _refController = TextEditingController();
  XFile? _screenshot;
  bool _loading = false;
  String? _paymentId;

  @override
  void initState() {
    super.initState();
    _loadInstructions();
  }

  @override
  void dispose() {
    _refController.dispose();
    super.dispose();
  }

  Future<void> _loadInstructions() async {
    final remote = ref.read(paymentRemoteProvider);
    final instructions = await remote.getInstructions();
    setState(() => _instructions = instructions);
  }

  Future<void> _createPayment() async {
    setState(() => _loading = true);
    try {
      final remote = ref.read(paymentRemoteProvider);
      final result = await remote.create(widget.propertyId, _method);
      final payment = PaymentModel.fromJson(result['payment'] as Map<String, dynamic>);
      setState(() => _paymentId = payment.id);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _submitPayment() async {
    if (_paymentId == null) {
      await _createPayment();
      if (_paymentId == null) return;
    }

    if (_refController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter transaction reference')),
      );
      return;
    }

    setState(() => _loading = true);
    try {
      final remote = ref.read(paymentRemoteProvider);
      MultipartFile? screenshot;
      if (_screenshot != null) {
        screenshot = await multipartFromXFile(_screenshot!);
      }

      await remote.submit(_paymentId!, _refController.text.trim(), screenshot);

      if (mounted) {
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppDecorations.radiusMd)),
            title: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.success.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.check_circle_outline, color: AppColors.success),
                ),
                const SizedBox(width: 12),
                const Text('Submitted!'),
              ],
            ),
            content: const Text(
              'Your payment has been submitted for verification. You will be notified once approved.',
            ),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  context.go('/my-listings');
                },
                child: const Text('Done'),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Payment', style: Theme.of(context).textTheme.headlineMedium),
      ),
      body: _instructions == null
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Container(
                  padding: const EdgeInsets.all(28),
                  decoration: AppDecorations.heroCard(),
                  child: Column(
                    children: [
                      const Text('Listing Fee', style: TextStyle(color: Colors.white70, fontSize: 14)),
                      const SizedBox(height: 8),
                      Text(
                        '${_instructions!.listingFeeEtb} ETB',
                        style: Theme.of(context).textTheme.displayMedium?.copyWith(color: Colors.white),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'One-time fee to publish your listing',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.white60),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 28),
                Text('Payment Method', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 12),
                _PaymentMethodCard(
                  title: 'Telebirr',
                  subtitle: '${_instructions!.telebirr['accountName'] ?? ''}\n${_instructions!.telebirr['accountNumber'] ?? ''}',
                  icon: Icons.phone_android_rounded,
                  isSelected: _method == 'telebirr',
                  onTap: () => setState(() => _method = 'telebirr'),
                ),
                const SizedBox(height: 10),
                _PaymentMethodCard(
                  title: 'Commercial Bank of Ethiopia',
                  subtitle: '${_instructions!.cbe['accountName'] ?? ''}\n${_instructions!.cbe['accountNumber'] ?? ''}',
                  icon: Icons.account_balance_rounded,
                  isSelected: _method == 'cbe',
                  onTap: () => setState(() => _method = 'cbe'),
                ),
                const SizedBox(height: 28),
                Text('Payment Details', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 12),
                TextField(
                  controller: _refController,
                  decoration: AppDecorations.inputDecoration(
                    label: 'Transaction Reference',
                    hint: 'Enter reference from receipt',
                    prefixIcon: Icons.receipt_long_outlined,
                  ),
                ),
                const SizedBox(height: 14),
                OutlinedButton.icon(
                  onPressed: () async {
                    final file = await ImagePicker().pickImage(source: ImageSource.gallery);
                    if (file != null) setState(() => _screenshot = file);
                  },
                  icon: const Icon(Icons.upload_file_rounded),
                  label: Text(_screenshot != null ? 'Screenshot Selected' : 'Upload Payment Screenshot'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(double.infinity, 52),
                  ),
                ),
                if (_screenshot != null) ...[
                  const SizedBox(height: 12),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(AppDecorations.radiusMd),
                    child: SizedBox(
                      height: 140,
                      width: double.infinity,
                      child: XFileImagePreview(file: _screenshot!, fit: BoxFit.cover),
                    ),
                  ),
                ],
                const SizedBox(height: 28),
                DelalaButton(
                  label: 'Submit Payment',
                  variant: DelalaButtonVariant.accent,
                  onPressed: _submitPayment,
                  isLoading: _loading,
                ),
              ],
            ),
    );
  }
}

class _PaymentMethodCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;

  const _PaymentMethodCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: isSelected ? AppColors.primary.withValues(alpha: 0.06) : AppColors.surface,
      borderRadius: BorderRadius.circular(AppDecorations.radiusMd),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppDecorations.radiusMd),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppDecorations.radiusMd),
            border: Border.all(
              color: isSelected ? AppColors.primary : AppColors.border,
              width: isSelected ? 1.5 : 1,
            ),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: isSelected ? AppColors.primary.withValues(alpha: 0.12) : AppColors.surfaceMuted,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: isSelected ? AppColors.primary : AppColors.textSecondary),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: TextStyle(fontWeight: FontWeight.w600, color: isSelected ? AppColors.primary : AppColors.textPrimary)),
                    const SizedBox(height: 2),
                    Text(subtitle, style: Theme.of(context).textTheme.bodySmall),
                  ],
                ),
              ),
              Icon(
                isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
                color: isSelected ? AppColors.primary : AppColors.textMuted,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
