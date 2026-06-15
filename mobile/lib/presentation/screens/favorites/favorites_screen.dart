import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/favorite_provider.dart';
import '../../widgets/bottom_nav_bar.dart';
import '../../widgets/property_card.dart';
import '../../widgets/state_widgets.dart';

class FavoritesScreen extends ConsumerWidget {
  const FavoritesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final favorites = ref.watch(favoritesProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('Saved', style: Theme.of(context).textTheme.headlineMedium),
      ),
      body: favorites.when(
        data: (properties) => properties.isEmpty
            ? const EmptyState(
                icon: Icons.favorite_border_rounded,
                title: 'No saved properties',
                subtitle: 'Tap the heart icon on any listing to save it here',
              )
            : ListView.separated(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 100),
                itemCount: properties.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (_, i) => PropertyCard(
                  property: properties[i],
                  width: double.infinity,
                  isHorizontal: true,
                ),
              ),
        loading: () => const LoadingState(),
        error: (e, _) => ErrorState(
          message: e.toString(),
          onRetry: () => ref.invalidate(favoritesProvider),
        ),
      ),
      bottomNavigationBar: const DelalaBottomNav(currentIndex: 2),
    );
  }
}
