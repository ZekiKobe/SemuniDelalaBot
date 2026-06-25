import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_decorations.dart';
import '../../../l10n/app_localizations.dart';
import '../../providers/unified_listing_provider.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/bottom_nav_bar.dart';
import '../../widgets/modern_listing_card.dart';
import '../../widgets/state_widgets.dart';
import '../../widgets/auth_gate.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final forRent = ref.watch(forRentListingsProvider);
    final forSale = ref.watch(forSaleListingsProvider);
    final marketplace = ref.watch(marketplaceListingsProvider);
    final featured = ref.watch(featuredUnifiedListingsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: RefreshIndicator(
          color: AppColors.primary,
          onRefresh: () async {
            ref.invalidate(forRentListingsProvider);
            ref.invalidate(forSaleListingsProvider);
            ref.invalidate(marketplaceListingsProvider);
            ref.invalidate(featuredUnifiedListingsProvider);
          },
          child: CustomScrollView(
            slivers: [
              // Modern Header
              SliverToBoxAdapter(child: _ModernHeader(ref: ref)),
              const SliverToBoxAdapter(child: SizedBox(height: 8)),
              
              // Search Bar
              SliverToBoxAdapter(child: _ModernSearchBar()),
              const SliverToBoxAdapter(child: SizedBox(height: 12)),
              
              // Category Quick Access
              SliverToBoxAdapter(child: _CategoryQuickAccess()),
              const SliverToBoxAdapter(child: SizedBox(height: 24)),
              
              // Featured Section
              SliverToBoxAdapter(
                child: _ModernSectionHeader(
                  title: 'Featured',
                  onSeeAll: () {
                    // TODO: Navigate to all featured
                  },
                ),
              ),
              SliverToBoxAdapter(child: _FeaturedSection(asyncValue: featured)),
              const SliverToBoxAdapter(child: SizedBox(height: 32)),
              
              // For Rent Section
              SliverToBoxAdapter(
                child: _ModernSectionHeader(
                  title: 'For Rent',
                  subtitle: 'Find your perfect home',
                  onSeeAll: () {
                    // TODO: Navigate to all rentals
                  },
                ),
              ),
              SliverToBoxAdapter(child: _ListingSection(asyncValue: forRent)),
              const SliverToBoxAdapter(child: SizedBox(height: 32)),
              
              // For Sale Section
              SliverToBoxAdapter(
                child: _ModernSectionHeader(
                  title: 'For Sale',
                  subtitle: 'Properties & products',
                  onSeeAll: () {
                    // TODO: Navigate to all sales
                  },
                ),
              ),
              SliverToBoxAdapter(child: _ListingSection(asyncValue: forSale)),
              const SliverToBoxAdapter(child: SizedBox(height: 32)),
              
              // Marketplace Section
              SliverToBoxAdapter(
                child: _ModernSectionHeader(
                  title: 'Marketplace',
                  subtitle: 'Latest products',
                  onSeeAll: () {
                    // TODO: Navigate to all marketplace
                  },
                ),
              ),
              SliverToBoxAdapter(child: _ListingSection(asyncValue: marketplace)),
              
              const SliverToBoxAdapter(child: SizedBox(height: 100)),
            ],
          ),
        ),
      ),
      bottomNavigationBar: const DelalaBottomNav(currentIndex: 0),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _handlePostListing(context, ref),
        backgroundColor: AppColors.accent,
        foregroundColor: Colors.white,
        elevation: 6,
        icon: const Icon(Icons.add_rounded, size: 24),
        label: const Text('Post Listing', style: TextStyle(fontWeight: FontWeight.w600)),
      ),
    );
  }

  Future<void> _handlePostListing(BuildContext context, WidgetRef ref) async {
    final hasAuth = await AuthGate.requireAuth(
      context,
      ref,
      message: 'Login to post a listing',
    );
    
    if (hasAuth && context.mounted) {
      context.push('/post-selection');
    }
  }
}

class _ModernHeader extends StatelessWidget {
  final WidgetRef ref;

  const _ModernHeader({required this.ref});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
      child: Row(
        children: [
          // Logo with gradient
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              gradient: AppColors.primaryGradient,
              borderRadius: BorderRadius.circular(14),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withValues(alpha: 0.3),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: const Icon(Icons.home_work_rounded, color: Colors.white, size: 24),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Delala',
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                ),
                Text(
                  'Find your home in Ethiopia',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppColors.textMuted,
                      ),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: () => _handleProfileTap(context, ref),
            style: IconButton.styleFrom(
              backgroundColor: AppColors.surfaceMuted,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            icon: const Icon(Icons.person_outline, size: 22),
          ),
        ],
      ),
    );
  }

  Future<void> _handleProfileTap(BuildContext context, WidgetRef ref) async {
    final isAuthenticated = ref.read(authProvider).isAuthenticated;
    
    if (isAuthenticated) {
      context.push('/profile');
    } else {
      final hasAuth = await AuthGate.requireAuth(
        context,
        ref,
        message: 'Login to view your profile and manage your listings',
      );
      
      if (hasAuth && context.mounted) {
        context.push('/profile');
      }
    }
  }
}

class _ModernSearchBar extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: GestureDetector(
        onTap: () => context.push('/search'),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.08),
                blurRadius: 12,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            children: [
              Icon(Icons.search_rounded, color: AppColors.textMuted, size: 24),
              const SizedBox(width: 12),
              Text(
                'Search properties, products...',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppColors.textMuted,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CategoryQuickAccess extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        children: [
          _CategoryChip(
            icon: Icons.home_work_rounded,
            label: 'Rentals',
            count: null,
            onTap: () {
              // TODO: Navigate to rent
            },
          ),
          const SizedBox(width: 12),
          _CategoryChip(
            icon: Icons.apartment_rounded,
            label: 'Buy Property',
            count: null,
            onTap: () {
              // TODO: Navigate to sale
            },
          ),
          const SizedBox(width: 12),
          _CategoryChip(
            icon: Icons.storefront_rounded,
            label: 'Marketplace',
            count: null,
            onTap: () {
              // TODO: Navigate to marketplace
            },
          ),
        ],
      ),
    );
  }
}

class _CategoryChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final int? count;
  final VoidCallback onTap;

  const _CategoryChip({
    required this.icon,
    required this.label,
    this.count,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.border, width: 1),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  icon,
                  color: AppColors.primary,
                  size: 20,
                ),
              ),
              const SizedBox(width: 10),
              Text(
                label,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                ),
              ),
              if (count != null) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    count.toString(),
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _ModernSectionHeader extends StatelessWidget {
  final String title;
  final String? subtitle;
  final VoidCallback? onSeeAll;

  const _ModernSectionHeader({
    required this.title,
    this.subtitle,
    this.onSeeAll,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
              ),
              if (subtitle != null) ...[
                const SizedBox(height: 2),
                Text(
                  subtitle!,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppColors.textMuted,
                      ),
                ),
              ],
            ],
          ),
          if (onSeeAll != null)
            TextButton(
              onPressed: onSeeAll,
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'See all',
                    style: TextStyle(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(width: 4),
                  Icon(Icons.arrow_forward_rounded, size: 16, color: AppColors.primary),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _FeaturedSection extends StatelessWidget {
  final AsyncValue asyncValue;

  const _FeaturedSection({required this.asyncValue});

  @override
  Widget build(BuildContext context) {
    return asyncValue.when(
      data: (listings) => listings.isEmpty
          ? const Padding(
              padding: EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              child: Text('No featured listings available yet'),
            )
          : SizedBox(
              height: 320,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                itemCount: listings.length,
                itemBuilder: (_, i) => Padding(
                  padding: const EdgeInsets.only(right: 16),
                  child: ModernListingCard(
                    listing: listings[i],
                    width: 320,
                    showCategory: true,
                  ),
                ),
              ),
            ),
      loading: () => SizedBox(
        height: 320,
        child: ListView.builder(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 20),
          itemCount: 3,
          itemBuilder: (_, __) => const Padding(
            padding: EdgeInsets.only(right: 16),
            child: ModernListingCardSkeleton(width: 320),
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

class _ListingSection extends StatelessWidget {
  final AsyncValue asyncValue;

  const _ListingSection({required this.asyncValue});

  @override
  Widget build(BuildContext context) {
    return asyncValue.when(
      data: (listings) => listings.isEmpty
          ? const Padding(
              padding: EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              child: Text('No listings available yet'),
            )
          : SizedBox(
              height: 310,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                itemCount: listings.length,
                itemBuilder: (_, i) => Padding(
                  padding: const EdgeInsets.only(right: 16),
                  child: ModernListingCard(
                    listing: listings[i],
                    width: 300,
                  ),
                ),
              ),
            ),
      loading: () => SizedBox(
        height: 310,
        child: ListView.builder(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 20),
          itemCount: 3,
          itemBuilder: (_, __) => const Padding(
            padding: EdgeInsets.only(right: 16),
            child: ModernListingCardSkeleton(width: 300),
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
