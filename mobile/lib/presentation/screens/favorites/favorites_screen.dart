import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../config/theme/app_colors.dart';
import '../../providers/favorite_provider.dart';
import '../../widgets/bottom_nav_bar.dart';
import '../../widgets/modern_listing_card.dart';
import '../../widgets/state_widgets.dart';

class FavoritesScreen extends ConsumerWidget {
  const FavoritesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final favorites = ref.watch(unifiedFavoritesProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        title: Text(
          'Saved',
          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
        ),
      ),
      body: favorites.when(
        data: (listings) => listings.isEmpty
            ? const EmptyState(
                icon: Icons.favorite_border_rounded,
                title: 'No saved listings',
                subtitle: 'Tap the heart icon on any listing to save it here',
              )
            : RefreshIndicator(
                color: AppColors.primary,
                onRefresh: () async {
                  ref.invalidate(unifiedFavoritesProvider);
                },
                child: GridView.builder(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 100),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 1,
                    childAspectRatio: 1.1,
                    mainAxisSpacing: 16,
                  ),
                  itemCount: listings.length,
                  itemBuilder: (_, i) => ModernListingCard(
                    listing: listings[i],
                    width: double.infinity,
                    showCategory: true,
                  ),
                ),
              ),
        loading: () => const LoadingState(),
        error: (e, _) => ErrorState(
          message: e.toString(),
          onRetry: () => ref.invalidate(unifiedFavoritesProvider),
        ),
      ),
      bottomNavigationBar: const DelalaBottomNav(currentIndex: 2),
    );
  }
}
