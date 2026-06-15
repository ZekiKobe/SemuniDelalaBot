import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_decorations.dart';
import '../../providers/property_provider.dart';
import '../../widgets/property_card.dart';
import '../../widgets/delala_button.dart';
import '../../widgets/state_widgets.dart';

class MyListingsScreen extends ConsumerWidget {
  const MyListingsScreen({super.key});

  String _statusLabel(String status) {
    switch (status) {
      case 'approved':
        return 'Live';
      case 'pending_payment':
        return 'Awaiting Payment';
      case 'pending_approval':
        return 'Under Review';
      case 'rejected':
        return 'Rejected';
      case 'draft':
        return 'Draft';
      case 'expired':
        return 'Expired';
      default:
        return status;
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'approved':
        return AppColors.success;
      case 'pending_payment':
      case 'pending_approval':
        return AppColors.warning;
      case 'rejected':
        return AppColors.error;
      default:
        return AppColors.textMuted;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final listings = ref.watch(myListingsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('My Listings', style: Theme.of(context).textTheme.headlineMedium),
        actions: [
          IconButton(
            onPressed: () => context.push('/create-property'),
            style: IconButton.styleFrom(backgroundColor: AppColors.surfaceMuted),
            icon: const Icon(Icons.add_rounded),
          ),
        ],
      ),
      body: listings.when(
        data: (properties) => properties.isEmpty
            ? EmptyState(
                icon: Icons.home_work_outlined,
                title: 'No listings yet',
                subtitle: 'Post your first property and reach thousands of renters',
                actionLabel: 'Post a Listing',
                onAction: () => context.push('/create-property'),
              )
            : ListView.separated(
                padding: const EdgeInsets.all(20),
                itemCount: properties.length,
                separatorBuilder: (_, __) => const SizedBox(height: 16),
                itemBuilder: (_, i) {
                  final p = properties[i];
                  return Column(
                    children: [
                      Stack(
                        children: [
                          PropertyCard(property: p, width: double.infinity, isHorizontal: true),
                          Positioned(
                            top: 10,
                            right: 10,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: _statusColor(p.status),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                _statusLabel(p.status),
                                style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (p.status == 'pending_payment' || p.status == 'rejected') ...[
                        const SizedBox(height: 10),
                        DelalaButton(
                          label: p.status == 'rejected' ? 'Resubmit Payment' : 'Pay 20 ETB to Publish',
                          variant: DelalaButtonVariant.accent,
                          onPressed: () => context.push('/payment/${p.id}'),
                        ),
                      ],
                    ],
                  );
                },
              ),
        loading: () => const LoadingState(),
        error: (e, _) => ErrorState(message: e.toString(), onRetry: () => ref.invalidate(myListingsProvider)),
      ),
    );
  }
}
