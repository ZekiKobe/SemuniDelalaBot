import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_decorations.dart';
import '../../providers/property_provider.dart';
import '../../widgets/bottom_nav_bar.dart';
import '../../widgets/property_card.dart';
import '../../widgets/search_bar_widget.dart';
import '../../widgets/section_header.dart';
import '../../widgets/state_widgets.dart';
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final featured = ref.watch(featuredPropertiesProvider);
    final newest = ref.watch(newPropertiesProvider);
    final popular = ref.watch(popularPropertiesProvider);
    final areas = ref.watch(popularAreasProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: RefreshIndicator(
          color: AppColors.primary,
          onRefresh: () async {
            ref.invalidate(featuredPropertiesProvider);
            ref.invalidate(newPropertiesProvider);
            ref.invalidate(popularPropertiesProvider);
            ref.invalidate(popularAreasProvider);
          },
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(child: _HomeHeader(onPostTap: () => context.push('/post-selection'))),
              const SliverToBoxAdapter(child: SizedBox(height: 20)),
              const SliverToBoxAdapter(child: SearchBarWidget()),
              const SliverToBoxAdapter(child: SizedBox(height: 8)),
              SliverToBoxAdapter(child: _HeroBanner()),
              SliverToBoxAdapter(
                child: SectionHeader(
                  title: 'Featured',
                  actionLabel: 'See all',
                  onAction: () => context.push('/search'),
                ),
              ),
              SliverToBoxAdapter(child: _HorizontalList(asyncValue: featured)),
              SliverToBoxAdapter(
                child: SectionHeader(
                  title: 'New Listings',
                  actionLabel: 'See all',
                  onAction: () => context.push('/search'),
                ),
              ),
              SliverToBoxAdapter(child: _HorizontalList(asyncValue: newest)),
              const SliverToBoxAdapter(child: SectionHeader(title: 'Most Viewed')),
              SliverToBoxAdapter(child: _HorizontalList(asyncValue: popular)),
              const SliverToBoxAdapter(child: SectionHeader(title: 'Popular Areas')),
              SliverToBoxAdapter(
                child: areas.when(
                  data: (areaList) => Padding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
                    child: Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: areaList.map((area) {
                        return _AreaChip(
                          name: area.name,
                          count: area.count,
                          onTap: () {
                            ref.read(searchFiltersProvider.notifier).state =
                                SearchFilters(subCity: area.name);
                            context.push('/search');
                          },
                        );
                      }).toList(),
                    ),
                  ),
                  loading: () => const SizedBox(height: 48),
                  error: (_, __) => const SizedBox(),
                ),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 100)),
            ],
          ),
        ),
      ),
      bottomNavigationBar: const DelalaBottomNav(currentIndex: 0),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/create-property'),
        backgroundColor: AppColors.accent,
        foregroundColor: Colors.white,
        elevation: 4,
        icon: const Icon(Icons.add_rounded),
        label: const Text('List Property'),
      ),
    );
  }
}

class _HomeHeader extends StatelessWidget {
  final VoidCallback onPostTap;
  const _HomeHeader({required this.onPostTap});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              gradient: AppColors.primaryGradient,
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(Icons.home_work_rounded, color: Colors.white, size: 24),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Delala', style: Theme.of(context).textTheme.headlineMedium),
                Text('Find your home in Ethiopia', style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
          IconButton(
            onPressed: onPostTap,
            style: IconButton.styleFrom(
              backgroundColor: AppColors.surfaceMuted,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            icon: const Icon(Icons.notifications_outlined, size: 22),
          ),
        ],
      ),
    );
  }
}

class _HeroBanner extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 16, 20, 8),
      padding: const EdgeInsets.all(24),
      decoration: AppDecorations.heroCard(),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Text(
                    '🇪🇹 Made for Ethiopia',
                    style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w500),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'Discover Your\nPerfect Home',
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        color: Colors.white,
                        height: 1.2,
                      ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Browse rentals or list your own property',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Colors.white.withValues(alpha: 0.75),
                      ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Icon(Icons.apartment_rounded, color: Colors.white, size: 40),
          ),
        ],
      ),
    );
  }
}

class _AreaChip extends StatelessWidget {
  final String name;
  final int count;
  final VoidCallback onTap;

  const _AreaChip({required this.name, required this.count, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(AppDecorations.radiusSm),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppDecorations.radiusSm),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppDecorations.radiusSm),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.location_on_outlined, size: 16, color: AppColors.accent),
              const SizedBox(width: 6),
              Text(name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '$count',
                  style: const TextStyle(fontSize: 11, color: AppColors.primary, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HorizontalList extends StatelessWidget {
  final AsyncValue asyncValue;
  const _HorizontalList({required this.asyncValue});

  @override
  Widget build(BuildContext context) {
    return asyncValue.when(
      data: (properties) => properties.isEmpty
          ? const Padding(
              padding: EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              child: Text('No listings available yet'),
            )
          : SizedBox(
              height: 300,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                itemCount: properties.length,
                itemBuilder: (_, i) => Padding(
                  padding: const EdgeInsets.only(right: 14),
                  child: PropertyCard(property: properties[i]),
                ),
              ),
            ),
      loading: () => SizedBox(
        height: 300,
        child: ListView.builder(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 20),
          itemCount: 3,
          itemBuilder: (_, __) => const Padding(
            padding: EdgeInsets.only(right: 14),
            child: PropertyCardSkeleton(),
          ),
        ),
      ),
      error: (e, _) => Padding(
        padding: const EdgeInsets.all(20),
        child: ErrorState(message: e.toString()),
      ),
    );
  }
}
