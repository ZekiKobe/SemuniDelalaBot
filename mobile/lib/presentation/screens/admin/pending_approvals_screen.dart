import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_decorations.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/network/dio_client.dart';
import '../../../data/datasources/remote/payment_remote_datasource.dart';
import '../../../data/datasources/remote/property_remote_datasource.dart';
import '../../../data/datasources/remote/requirement_remote_datasource.dart';
import '../../../data/models/payment_model.dart';
import '../../../data/models/property_model.dart';
import '../../../data/models/requirement_model.dart';
import '../../widgets/state_widgets.dart';

final pendingPaymentsProvider = FutureProvider<List<PaymentModel>>((ref) async {
  final dio = ref.watch(dioProvider);
  final remote = PaymentRemoteDataSource(dio);
  return remote.getPendingPayments();
});

final pendingRequirementsProvider = FutureProvider<List<RequirementModel>>((ref) async {
  final dio = ref.watch(dioProvider);
  final remote = RequirementRemoteDataSource(dio);
  return remote.getPendingRequirements();
});

final pendingTelegramListingsProvider = FutureProvider<List<PropertyModel>>((ref) async {
  final dio = ref.watch(dioProvider);
  final remote = PropertyRemoteDataSource(dio);
  return remote.getPendingTelegramListings();
});

final telegramPostsProvider = FutureProvider<List<dynamic>>((ref) async {
  final dio = ref.watch(dioProvider);
  final response = await dio.get(ApiConstants.adminTelegramPosts);
  final data = response.data['data'] as List<dynamic>;
  return data;
});

class PendingApprovalsScreen extends ConsumerStatefulWidget {
  const PendingApprovalsScreen({super.key});

  @override
  ConsumerState<PendingApprovalsScreen> createState() => _PendingApprovalsScreenState();
}

class _PendingApprovalsScreenState extends ConsumerState<PendingApprovalsScreen> {
  int _selectedTab = 0;

  @override
  Widget build(BuildContext context) {
    final payments = ref.watch(pendingPaymentsProvider);
    final telegramListings = ref.watch(pendingTelegramListingsProvider);
    final telegramPosts = ref.watch(telegramPostsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('Pending Approvals', style: Theme.of(context).textTheme.headlineMedium),
      ),
      body: Column(
        children: [
          // Tab bar for switching between payments and telegram posts
          Container(
            decoration: BoxDecoration(
              color: AppColors.surface,
              border: Border(bottom: BorderSide(color: AppColors.border)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: _TabButton(
                    label: 'Payments',
                    isSelected: _selectedTab == 0,
                    onTap: () => setState(() => _selectedTab = 0),
                  ),
                ),
                Expanded(
                  child: _TabButton(
                    label: 'Requirements',
                    isSelected: _selectedTab == 1,
                    onTap: () => setState(() => _selectedTab = 1),
                  ),
                ),
                Expanded(
                  child: _TabButton(
                    label: 'Listings',
                    isSelected: _selectedTab == 2,
                    onTap: () => setState(() => _selectedTab = 2),
                  ),
                ),
                Expanded(
                  child: _TabButton(
                    label: 'Posts',
                    isSelected: _selectedTab == 3,
                    onTap: () => setState(() => _selectedTab = 3),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: _selectedTab == 0
                ? _buildPaymentsList(payments)
                : _selectedTab == 1
                    ? _buildRequirementsList(ref.watch(pendingRequirementsProvider))
                    : _selectedTab == 2
                        ? _buildTelegramListingsList(telegramListings)
                        : _buildTelegramPostsList(telegramPosts),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentsList(AsyncValue<List<PaymentModel>> payments) {
    return payments.when(
      data: (paymentData) {
        if (paymentData.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.check_circle_outline, size: 64, color: AppColors.success),
                const SizedBox(height: 16),
                Text(
                  'No pending payments',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 8),
                Text(
                  'All payments have been processed',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppColors.textMuted,
                      ),
                ),
              ],
            ),
          );
        }

        return RefreshIndicator(
          color: AppColors.primary,
          onRefresh: () async {
            ref.invalidate(pendingPaymentsProvider);
            ref.invalidate(pendingTelegramListingsProvider);
            ref.invalidate(telegramPostsProvider);
          },
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: paymentData.length,
            itemBuilder: (context, index) {
              return _PaymentApprovalCard(payment: paymentData[index]);
            },
          ),
        );
      },
      loading: () => const LoadingState(),
      error: (e, _) => ErrorState(
        message: e.toString(),
        onRetry: () {
          ref.invalidate(pendingPaymentsProvider);
          ref.invalidate(pendingTelegramListingsProvider);
          ref.invalidate(telegramPostsProvider);
        },
      ),
    );
  }

  Widget _buildRequirementsList(AsyncValue<List<RequirementModel>> requirements) {
    return requirements.when(
      data: (items) {
        if (items.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.list_alt_outlined, size: 64, color: AppColors.textMuted),
                const SizedBox(height: 16),
                Text(
                  'No pending requirements',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 8),
                Text(
                  'All telegram requirements have been reviewed',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppColors.textMuted,
                      ),
                ),
              ],
            ),
          );
        }

        return RefreshIndicator(
          color: AppColors.primary,
          onRefresh: () async {
            ref.invalidate(pendingPaymentsProvider);
            ref.invalidate(pendingRequirementsProvider);
            ref.invalidate(pendingTelegramListingsProvider);
            ref.invalidate(telegramPostsProvider);
          },
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: items.length,
            itemBuilder: (context, index) {
              return _RequirementApprovalCard(requirement: items[index]);
            },
          ),
        );
      },
      loading: () => const LoadingState(),
      error: (e, _) => ErrorState(
        message: e.toString(),
        onRetry: () {
          ref.invalidate(pendingPaymentsProvider);
          ref.invalidate(pendingRequirementsProvider);
          ref.invalidate(pendingTelegramListingsProvider);
          ref.invalidate(telegramPostsProvider);
        },
      ),
    );
  }

  Widget _buildTelegramListingsList(AsyncValue<List<PropertyModel>> listings) {
    return listings.when(
      data: (items) {
        if (items.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.home_work_outlined, size: 64, color: AppColors.textMuted),
                const SizedBox(height: 16),
                Text(
                  'No pending telegram listings',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 8),
                Text(
                  'All telegram property submissions have been reviewed',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppColors.textMuted,
                      ),
                ),
              ],
            ),
          );
        }

        return RefreshIndicator(
          color: AppColors.primary,
          onRefresh: () async {
            ref.invalidate(pendingPaymentsProvider);
            ref.invalidate(pendingRequirementsProvider);
            ref.invalidate(pendingTelegramListingsProvider);
            ref.invalidate(telegramPostsProvider);
          },
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: items.length,
            itemBuilder: (context, index) {
              return _TelegramListingApprovalCard(property: items[index]);
            },
          ),
        );
      },
      loading: () => const LoadingState(),
      error: (e, _) => ErrorState(
        message: e.toString(),
        onRetry: () {
          ref.invalidate(pendingPaymentsProvider);
          ref.invalidate(pendingRequirementsProvider);
          ref.invalidate(pendingTelegramListingsProvider);
          ref.invalidate(telegramPostsProvider);
        },
      ),
    );
  }

  Widget _buildTelegramPostsList(AsyncValue<List<dynamic>> telegramPosts) {
    return telegramPosts.when(
      data: (posts) {
        if (posts.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.telegram, size: 64, color: AppColors.textMuted),
                const SizedBox(height: 16),
                Text(
                  'No telegram posts',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 8),
                Text(
                  'No listings posted from telegram yet',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppColors.textMuted,
                      ),
                ),
              ],
            ),
          );
        }

        return RefreshIndicator(
          color: AppColors.primary,
          onRefresh: () async {
            ref.invalidate(pendingPaymentsProvider);
            ref.invalidate(pendingRequirementsProvider);
            ref.invalidate(pendingTelegramListingsProvider);
            ref.invalidate(telegramPostsProvider);
          },
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: posts.length,
            itemBuilder: (context, index) {
              return _TelegramPostCard(post: posts[index]);
            },
          ),
        );
      },
      loading: () => const LoadingState(),
      error: (e, _) => ErrorState(
        message: e.toString(),
        onRetry: () {
          ref.invalidate(pendingPaymentsProvider);
          ref.invalidate(pendingRequirementsProvider);
          ref.invalidate(pendingTelegramListingsProvider);
          ref.invalidate(telegramPostsProvider);
        },
      ),
    );
  }
}


class _TabButton extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _TabButton({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(
              color: isSelected ? AppColors.primary : Colors.transparent,
              width: 2,
            ),
          ),
        ),
        child: Text(
          label,
          textAlign: TextAlign.center,
          style: TextStyle(
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
            color: isSelected ? AppColors.primary : AppColors.textSecondary,
          ),
        ),
      ),
    );
  }
}

class _TelegramListingApprovalCard extends ConsumerStatefulWidget {
  final PropertyModel property;

  const _TelegramListingApprovalCard({required this.property});

  @override
  ConsumerState<_TelegramListingApprovalCard> createState() => _TelegramListingApprovalCardState();
}

class _TelegramListingApprovalCardState extends ConsumerState<_TelegramListingApprovalCard> {
  bool _isApproving = false;
  bool _isRejecting = false;

  Future<void> _approve() async {
    setState(() => _isApproving = true);
    try {
      final remote = PropertyRemoteDataSource(ref.read(dioProvider));
      await remote.approveProperty(widget.property.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Telegram listing approved')),
        );
        ref.invalidate(pendingTelegramListingsProvider);
        ref.invalidate(telegramPostsProvider);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isApproving = false);
    }
  }

  Future<void> _reject() async {
    final reasonController = TextEditingController();

    final result = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Reject Listing'),
        content: TextField(
          controller: reasonController,
          decoration: const InputDecoration(
            labelText: 'Rejection Reason',
            hintText: 'Enter reason for rejection',
          ),
          maxLines: 3,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, reasonController.text.trim()),
            child: const Text('Reject', style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );

    if (result == null || result.isEmpty) return;

    setState(() => _isRejecting = true);
    try {
      final remote = PropertyRemoteDataSource(ref.read(dioProvider));
      await remote.rejectProperty(widget.property.id, result);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Telegram listing rejected')),
        );
        ref.invalidate(pendingTelegramListingsProvider);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isRejecting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final property = widget.property;
    final submittedAt = property.createdAt;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: AppDecorations.card(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(Icons.telegram, color: AppColors.primary),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        property.title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        property.telegramUsername ?? 'Telegram submission',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: AppColors.textMuted,
                            ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.warning.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    'PENDING',
                    style: TextStyle(
                      color: AppColors.warning,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _InfoRow(label: 'Price', value: '${property.rentPrice} ETB'),
                const SizedBox(height: 8),
                _InfoRow(label: 'Type', value: property.propertyType.replaceAll('_', ' ')),
                const SizedBox(height: 8),
                _InfoRow(label: 'Location', value: '${property.subCity}, ${property.city}'),
                const SizedBox(height: 8),
                _InfoRow(label: 'Contact', value: property.contactPhone),
                const SizedBox(height: 8),
                _InfoRow(
                  label: 'Submitted',
                  value: submittedAt != null
                      ? '${submittedAt.day}/${submittedAt.month}/${submittedAt.year}'
                      : 'N/A',
                ),
                if (property.description.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  _InfoRow(label: 'Details', value: property.description),
                ],
              ],
            ),
          ),
          if (property.primaryImage != null) ...[
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.all(16),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(AppDecorations.radiusMd),
                child: Image.network(
                  property.primaryImage!,
                  height: 180,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) {
                    return Container(
                      height: 180,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        border: Border.all(color: AppColors.border),
                        borderRadius: BorderRadius.circular(AppDecorations.radiusMd),
                      ),
                      child: Icon(Icons.broken_image, size: 48, color: AppColors.textMuted),
                    );
                  },
                ),
              ),
            ),
          ],
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _isRejecting ? null : _reject,
                    icon: _isRejecting
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.close_rounded),
                    label: Text(_isRejecting ? 'Rejecting...' : 'Reject'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.error,
                      side: const BorderSide(color: AppColors.error),
                      minimumSize: const Size(double.infinity, 48),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _isApproving ? null : _approve,
                    icon: _isApproving
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Icon(Icons.check_rounded),
                    label: Text(_isApproving ? 'Approving...' : 'Approve'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.success,
                      foregroundColor: Colors.white,
                      minimumSize: const Size(double.infinity, 48),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TelegramPostCard extends StatelessWidget {
  final dynamic post;

  const _TelegramPostCard({required this.post});

  @override
  Widget build(BuildContext context) {
    final property = post['propertyId'] as Map<String, dynamic>?;
    final status = post['status'] as String? ?? 'unknown';
    final postedAt = post['postedAt'] != null
        ? DateTime.parse(post['postedAt'] as String)
        : post['createdAt'] != null
            ? DateTime.parse(post['createdAt'] as String)
            : null;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: AppDecorations.card(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(Icons.telegram, color: AppColors.primary),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        property?['title'] ?? 'Unknown Property',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Channel ID: ${post['channelId'] ?? 'N/A'}',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: AppColors.textMuted,
                            ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: _getStatusColor(status).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    status.toUpperCase(),
                    style: TextStyle(
                      color: _getStatusColor(status),
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _InfoRow(
                  label: 'Message ID',
                  value: post['messageId']?.toString() ?? 'N/A',
                ),
                const SizedBox(height: 8),
                _InfoRow(
                  label: 'Posted',
                  value: postedAt != null
                      ? '${postedAt.day}/${postedAt.month}/${postedAt.year}'
                      : 'N/A',
                ),
                if (post['error'] != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    'Error: ${post['error']}',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppColors.error,
                        ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'sent':
        return AppColors.success;
      case 'failed':
        return AppColors.error;
      case 'deleted':
        return AppColors.textMuted;
      default:
        return AppColors.warning;
    }
  }
}

class _RequirementApprovalCard extends ConsumerStatefulWidget {
  final RequirementModel requirement;

  const _RequirementApprovalCard({required this.requirement});

  @override
  ConsumerState<_RequirementApprovalCard> createState() => _RequirementApprovalCardState();
}

class _RequirementApprovalCardState extends ConsumerState<_RequirementApprovalCard> {
  bool _isApproving = false;
  bool _isRejecting = false;

  Future<void> _approve() async {
    setState(() => _isApproving = true);
    try {
      final dio = ref.read(dioProvider);
      final remote = RequirementRemoteDataSource(dio);
      await remote.approveRequirement(widget.requirement.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Requirement approved successfully')),
        );
        ref.invalidate(pendingRequirementsProvider);
        ref.invalidate(telegramPostsProvider);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isApproving = false);
    }
  }

  Future<void> _reject() async {
    final reasonController = TextEditingController();

    final result = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Reject Requirement'),
        content: TextField(
          controller: reasonController,
          decoration: const InputDecoration(
            labelText: 'Rejection Reason',
            hintText: 'Enter reason for rejection',
          ),
          maxLines: 3,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, reasonController.text.trim()),
            child: const Text('Reject', style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );

    if (result == null || result.isEmpty) return;

    setState(() => _isRejecting = true);
    try {
      final dio = ref.read(dioProvider);
      final remote = RequirementRemoteDataSource(dio);
      await remote.rejectRequirement(widget.requirement.id, result);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Requirement rejected')),
        );
        ref.invalidate(pendingRequirementsProvider);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isRejecting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final requirement = widget.requirement;
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: AppDecorations.card(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.accent.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(Icons.list_alt_rounded, color: AppColors.accent),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        requirement.title,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        requirement.typeLabel,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: AppColors.textMuted,
                            ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.warning.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    requirement.status.replaceAll('_', ' ').toUpperCase(),
                    style: TextStyle(
                      color: AppColors.warning,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _InfoRow(label: 'Budget', value: '${requirement.budget} ETB'),
                const SizedBox(height: 8),
                _InfoRow(label: 'Location', value: requirement.location),
                const SizedBox(height: 8),
                _InfoRow(label: 'Contact', value: requirement.contactPhone),
                if (requirement.description.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  _InfoRow(label: 'Details', value: requirement.description),
                ],
                if (requirement.rejectionReason != null && requirement.rejectionReason!.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  _InfoRow(label: 'Reason', value: requirement.rejectionReason!),
                ],
              ],
            ),
          ),
          if (requirement.paymentProofUrl != null) ...[
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Payment Proof',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 12),
                  GestureDetector(
                    onTap: () => _showPaymentProof(context, requirement.paymentProofUrl!),
                    child: Container(
                      height: 180,
                      width: double.infinity,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(AppDecorations.radiusMd),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(AppDecorations.radiusMd),
                        child: Image.network(
                          _getFullImageUrl(requirement.paymentProofUrl!),
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) {
                            return Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.broken_image, size: 48, color: AppColors.textMuted),
                                  const SizedBox(height: 8),
                                  Text(
                                    'Failed to load image',
                                    style: Theme.of(context).textTheme.bodySmall,
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _isRejecting ? null : _reject,
                    icon: _isRejecting
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.close_rounded),
                    label: Text(_isRejecting ? 'Rejecting...' : 'Reject'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.error,
                      side: const BorderSide(color: AppColors.error),
                      minimumSize: const Size(double.infinity, 48),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _isApproving ? null : _approve,
                    icon: _isApproving
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Icon(Icons.check_rounded),
                    label: Text(_isApproving ? 'Approving...' : 'Approve'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.success,
                      foregroundColor: Colors.white,
                      minimumSize: const Size(double.infinity, 48),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showPaymentProof(BuildContext context, String url) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (ctx) => Scaffold(
          appBar: AppBar(
            title: const Text('Payment Proof'),
          ),
          body: Center(
            child: Image.network(
              _getFullImageUrl(url),
              fit: BoxFit.contain,
            ),
          ),
        ),
      ),
    );
  }

  String _getFullImageUrl(String url) {
    if (url.startsWith('http')) return url;
    return 'http://localhost:5000$url';
  }
}

class _PaymentApprovalCard extends ConsumerStatefulWidget {
  final PaymentModel payment;

  const _PaymentApprovalCard({required this.payment});

  @override
  ConsumerState<_PaymentApprovalCard> createState() => _PaymentApprovalCardState();
}

class _PaymentApprovalCardState extends ConsumerState<_PaymentApprovalCard> {
  bool _isApproving = false;
  bool _isRejecting = false;

  Future<void> _approve() async {
    setState(() => _isApproving = true);
    try {
      final dio = ref.read(dioProvider);
      final remote = PaymentRemoteDataSource(dio);
      await remote.approvePayment(widget.payment.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Payment approved successfully')),
        );
        ref.invalidate(pendingPaymentsProvider);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isApproving = false);
    }
  }

  Future<void> _reject() async {
    final reasonController = TextEditingController();
    
    final result = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Reject Payment'),
        content: TextField(
          controller: reasonController,
          decoration: const InputDecoration(
            labelText: 'Rejection Reason',
            hintText: 'Enter reason for rejection',
          ),
          maxLines: 3,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, reasonController.text.trim()),
            child: const Text('Reject', style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );

    if (result == null || result.isEmpty) return;

    setState(() => _isRejecting = true);
    try {
      final dio = ref.read(dioProvider);
      final remote = PaymentRemoteDataSource(dio);
      await remote.rejectPayment(widget.payment.id, result, null);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Payment rejected')),
        );
        ref.invalidate(pendingPaymentsProvider);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isRejecting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: AppDecorations.card(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.accent.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(Icons.payment_rounded, color: AppColors.accent),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${widget.payment.amount} ETB',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                      Text(
                        widget.payment.method.toUpperCase(),
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: AppColors.textMuted,
                            ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.warning.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    'Pending',
                    style: TextStyle(
                      color: AppColors.warning,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _InfoRow(
                  label: 'Transaction Ref',
                  value: widget.payment.transactionReference ?? 'N/A',
                ),
                const SizedBox(height: 8),
                _InfoRow(
                  label: 'Property ID',
                  value: widget.payment.propertyId,
                ),
                const SizedBox(height: 8),
                _InfoRow(
                  label: 'Submitted',
                  value: widget.payment.submittedAt != null
                      ? '${widget.payment.submittedAt!.day}/${widget.payment.submittedAt!.month}/${widget.payment.submittedAt!.year}'
                      : 'N/A',
                ),
              ],
            ),
          ),
          if (widget.payment.screenshotUrl != null) ...[
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Payment Proof',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 12),
                  GestureDetector(
                    onTap: () => _showScreenshot(context),
                    child: Container(
                      height: 180,
                      width: double.infinity,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(AppDecorations.radiusMd),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(AppDecorations.radiusMd),
                        child: Image.network(
                          _getFullImageUrl(widget.payment.screenshotUrl!),
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) {
                            return Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.broken_image, size: 48, color: AppColors.textMuted),
                                  const SizedBox(height: 8),
                                  Text(
                                    'Failed to load image',
                                    style: Theme.of(context).textTheme.bodySmall,
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _isRejecting ? null : _reject,
                    icon: _isRejecting
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.close_rounded),
                    label: Text(_isRejecting ? 'Rejecting...' : 'Reject'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.error,
                      side: const BorderSide(color: AppColors.error),
                      minimumSize: const Size(double.infinity, 48),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _isApproving ? null : _approve,
                    icon: _isApproving
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Icon(Icons.check_rounded),
                    label: Text(_isApproving ? 'Approving...' : 'Approve'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.success,
                      foregroundColor: Colors.white,
                      minimumSize: const Size(double.infinity, 48),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showScreenshot(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (ctx) => Scaffold(
          appBar: AppBar(
            title: const Text('Payment Proof'),
          ),
          body: Center(
            child: Image.network(
              _getFullImageUrl(widget.payment.screenshotUrl!),
              fit: BoxFit.contain,
            ),
          ),
        ),
      ),
    );
  }

  String _getFullImageUrl(String url) {
    if (url.startsWith('http')) {
      return url;
    }
    // Add backend base URL if the URL is relative
    return 'http://localhost:5000$url';
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;

  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 120,
          child: Text(
            label,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AppColors.textMuted,
                ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w500,
                ),
          ),
        ),
      ],
    );
  }
}
