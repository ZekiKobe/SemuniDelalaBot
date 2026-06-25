import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_decorations.dart';
import '../../../data/models/unified_listing_model.dart';
import '../../../data/datasources/remote/unified_listing_remote_datasource.dart';
import '../../../core/network/dio_client.dart';
import '../../widgets/state_widgets.dart';
import '../../widgets/auth_gate.dart';
import '../../providers/auth_provider.dart';
import '../../providers/favorite_provider.dart';

// Provider for fetching listing detail by ID
final listingDetailProvider = FutureProvider.family<UnifiedListingModel, String>((ref, id) async {
  final dio = ref.watch(dioProvider);
  final datasource = UnifiedListingRemoteDataSource(dio);
  
  // Try to get from each endpoint - this is a simple approach
  // In production, you might want a dedicated endpoint for fetching by ID
  final rentals = await datasource.getForRent(limit: 100);
  final forSale = await datasource.getForSale(limit: 100);
  final marketplace = await datasource.getMarketplace(limit: 100);
  
  final all = [...rentals, ...forSale, ...marketplace];
  return all.firstWhere((listing) => listing.id == id);
});

class ListingDetailScreen extends ConsumerWidget {
  final UnifiedListingModel listing;

  const ListingDetailScreen({super.key, required this.listing});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final favorites = ref.watch(favoritesNotifierProvider);
    final isFavorited = favorites.contains(listing.id);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          _buildAppBar(context, ref, isFavorited),
          SliverToBoxAdapter(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildImageGallery(context),
                _buildMainInfo(context),
                _buildDetails(context),
                if (listing.description.isNotEmpty) _buildDescription(context),
                _buildLocation(context),
                _buildContactSection(context),
                const SizedBox(height: 100),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: _buildBottomBar(context, ref),
    );
  }

  Widget _buildAppBar(BuildContext context, WidgetRef ref, bool isFavorited) {
    return SliverAppBar(
      expandedHeight: 0,
      floating: true,
      pinned: true,
      backgroundColor: AppColors.surface,
      elevation: 0,
      leading: IconButton(
        onPressed: () => Navigator.pop(context),
        icon: const Icon(Icons.arrow_back_rounded),
      ),
      title: Text(
        listing.categoryLabel,
        style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
      ),
      actions: [
        IconButton(
          onPressed: () => _handleFavoriteToggle(context, ref),
          icon: Icon(
            isFavorited ? Icons.favorite_rounded : Icons.favorite_border_rounded,
            color: isFavorited ? AppColors.accent : null,
          ),
        ),
      ],
    );
  }

  Future<void> _handleFavoriteToggle(BuildContext context, WidgetRef ref) async {
    final hasAuth = await AuthGate.requireAuth(
      context,
      ref,
      message: 'Login to save listings',
    );
    
    if (hasAuth) {
      await ref.read(favoritesNotifierProvider.notifier).toggle(listing.id);
    }
  }

  Widget _buildImageGallery(BuildContext context) {
    if (listing.images.isEmpty) {
      return Container(
        height: 300,
        color: AppColors.surfaceMuted,
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                listing.isRequirement
                    ? Icons.search_rounded
                    : listing.category == ListingCategory.marketplace
                        ? Icons.shopping_bag_outlined
                        : Icons.home_outlined,
                size: 64,
                color: AppColors.textMuted,
              ),
              const SizedBox(height: 16),
              Text(
                'No photos available',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppColors.textMuted,
                    ),
              ),
            ],
          ),
        ),
      );
    }

    return SizedBox(
      height: 300,
      child: PageView.builder(
        itemCount: listing.images.length,
        itemBuilder: (context, index) {
          return Image.network(
            listing.images[index].url,
            fit: BoxFit.cover,
            loadingBuilder: (context, child, loadingProgress) {
              if (loadingProgress == null) return child;
              return Container(
                color: AppColors.surfaceMuted,
                child: Center(
                  child: CircularProgressIndicator(
                    value: loadingProgress.expectedTotalBytes != null
                        ? loadingProgress.cumulativeBytesLoaded /
                            loadingProgress.expectedTotalBytes!
                        : null,
                  ),
                ),
              );
            },
            errorBuilder: (context, error, stackTrace) {
              print('Error loading image: ${listing.images[index].url}');
              print('Error: $error');
              return Container(
                color: AppColors.surfaceMuted,
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.broken_image, size: 48, color: AppColors.textMuted),
                      const SizedBox(height: 8),
                      Text(
                        'Image unavailable',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }

  Widget _buildMainInfo(BuildContext context) {
    return Container(
      color: AppColors.surface,
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  listing.title,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                ),
              ),
              if (listing.fromTelegram)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.telegram, size: 16, color: AppColors.primary),
                      const SizedBox(width: 6),
                      Text(
                        'Posted via Telegram',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppColors.primary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: listing.isRequirement
                      ? AppColors.warning.withValues(alpha: 0.1)
                      : AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  listing.isRequirement ? 'WANTED' : listing.typeLabel,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: listing.isRequirement ? AppColors.warning : AppColors.primary,
                  ),
                ),
              ),
              const Spacer(),
              Text(
                listing.isRequirement ? 'Budget: ${listing.priceDisplay}' : listing.priceDisplay,
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w700,
                    ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDetails(BuildContext context) {
    final details = <MapEntry<String, String>>[];

    // Add relevant details based on listing type
    if (listing.category == ListingCategory.marketplace) {
      if (listing.productCategory != null) {
        details.add(MapEntry('Category', listing.productCategory!));
      }
      if (listing.condition != null) {
        details.add(MapEntry('Condition', listing.displayCondition));
      }
      if (listing.brand != null) {
        details.add(MapEntry('Brand', listing.brand!));
      }
    } else {
      if (listing.propertyType != null) {
        details.add(MapEntry('Type', listing.propertyType!.replaceAll('_', ' ')));
      }
      if (listing.bedrooms != null) {
        details.add(MapEntry('Bedrooms', listing.bedrooms.toString()));
      }
      if (listing.bathrooms != null) {
        details.add(MapEntry('Bathrooms', listing.bathrooms.toString()));
      }
      if (listing.area != null) {
        details.add(MapEntry('Area', '${listing.area} m²'));
      }
    }

    if (details.isEmpty) return const SizedBox.shrink();

    return Container(
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.all(20),
      color: AppColors.surface,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Details',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: details.map((detail) {
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: AppColors.surfaceMuted,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      detail.key,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppColors.textMuted,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      detail.value,
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildDescription(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.all(20),
      color: AppColors.surface,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Description',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
          ),
          const SizedBox(height: 12),
          Text(
            listing.description,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  height: 1.6,
                ),
          ),
        ],
      ),
    );
  }

  Widget _buildLocation(BuildContext context) {
    if (listing.location.full.isEmpty) return const SizedBox.shrink();

    return Container(
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.all(20),
      color: AppColors.surface,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Location',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Icon(Icons.location_on_rounded, color: AppColors.primary, size: 24),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  listing.location.full,
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildContactSection(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.all(20),
      color: AppColors.surface,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Contact Information',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Icon(Icons.phone_rounded, color: AppColors.primary, size: 24),
              const SizedBox(width: 12),
              Text(
                listing.contactPhone,
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
              ),
            ],
          ),
          if (listing.telegramUsername != null) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Icon(Icons.telegram, color: AppColors.primary, size: 24),
                const SizedBox(width: 12),
                Text(
                  '@${listing.telegramUsername}',
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildBottomBar(BuildContext context, WidgetRef ref) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 12,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        child: Row(
          children: [
            Expanded(
              child: ElevatedButton.icon(
                onPressed: () => _handleCall(context, ref),
                icon: const Icon(Icons.phone_rounded),
                label: const Text('Call'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () => _handleMessage(context, ref),
                icon: const Icon(Icons.message_rounded),
                label: const Text('Message'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  side: const BorderSide(color: AppColors.primary, width: 2),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _handleCall(BuildContext context, WidgetRef ref) async {
    final hasAuth = await AuthGate.requireAuth(
      context,
      ref,
      message: 'Login to call the seller',
    );
    
    if (hasAuth && context.mounted) {
      await _makePhoneCall(listing.contactPhone);
    }
  }

  Future<void> _handleMessage(BuildContext context, WidgetRef ref) async {
    final hasAuth = await AuthGate.requireAuth(
      context,
      ref,
      message: 'Login to message the seller',
    );
    
    if (hasAuth && context.mounted) {
      await _sendMessage(listing.contactPhone);
    }
  }

  Future<void> _makePhoneCall(String phoneNumber) async {
    final uri = Uri.parse('tel:$phoneNumber');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  Future<void> _sendMessage(String phoneNumber) async {
    final uri = Uri.parse('sms:$phoneNumber');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }
}
