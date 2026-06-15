import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_decorations.dart';
import '../../../core/utils/formatters.dart';
import '../../providers/favorite_provider.dart';
import '../../providers/property_provider.dart';
import '../../widgets/property_card.dart';
import '../../widgets/delala_button.dart';
import '../../widgets/state_widgets.dart';

class PropertyDetailScreen extends ConsumerWidget {
  final String id;

  const PropertyDetailScreen({super.key, required this.id});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final propertyAsync = ref.watch(propertyDetailProvider(id));
    final relatedAsync = ref.watch(relatedPropertiesProvider(id));
    final isFavAsync = ref.watch(isFavoritedProvider(id));

    return propertyAsync.when(
      loading: () => const Scaffold(body: LoadingState()),
      error: (e, _) => Scaffold(
        appBar: AppBar(),
        body: ErrorState(message: e.toString(), onRetry: () => ref.invalidate(propertyDetailProvider(id))),
      ),
      data: (property) => Scaffold(
        backgroundColor: AppColors.background,
        body: CustomScrollView(
          slivers: [
            SliverAppBar(
              expandedHeight: 320,
              pinned: true,
              backgroundColor: AppColors.primary,
              leading: Padding(
                padding: const EdgeInsets.all(8),
                child: CircleAvatar(
                  backgroundColor: Colors.white.withValues(alpha: 0.9),
                  child: IconButton(
                    icon: const Icon(Icons.arrow_back_rounded, color: AppColors.textPrimary, size: 20),
                    onPressed: () => Navigator.pop(context),
                  ),
                ),
              ),
              actions: [
                isFavAsync.when(
                  data: (isFav) => Padding(
                    padding: const EdgeInsets.all(8),
                    child: CircleAvatar(
                      backgroundColor: Colors.white.withValues(alpha: 0.9),
                      child: IconButton(
                        icon: Icon(
                          isFav ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                          color: isFav ? AppColors.accent : AppColors.textPrimary,
                          size: 20,
                        ),
                        onPressed: () async {
                          final remote = ref.read(favoriteRemoteProvider);
                          if (isFav) {
                            await remote.remove(property.id);
                          } else {
                            await remote.add(property.id);
                          }
                          ref.invalidate(isFavoritedProvider(id));
                          ref.invalidate(favoritesProvider);
                        },
                      ),
                    ),
                  ),
                  loading: () => const SizedBox(),
                  error: (_, __) => const SizedBox(),
                ),
                Padding(
                  padding: const EdgeInsets.all(8),
                  child: CircleAvatar(
                    backgroundColor: Colors.white.withValues(alpha: 0.9),
                    child: IconButton(
                      icon: const Icon(Icons.share_rounded, color: AppColors.textPrimary, size: 20),
                      onPressed: () => Share.share('Check out ${property.title} on Delala'),
                    ),
                  ),
                ),
              ],
              flexibleSpace: FlexibleSpaceBar(
                background: property.images.isNotEmpty
                    ? PageView.builder(
                        itemCount: property.images.length,
                        itemBuilder: (_, i) => CachedNetworkImage(
                          imageUrl: property.images[i].url,
                          fit: BoxFit.cover,
                        ),
                      )
                    : Container(
                        color: AppColors.surfaceMuted,
                        child: const Icon(Icons.home_work_outlined, size: 64, color: AppColors.textMuted),
                      ),
              ),
            ),
            SliverToBoxAdapter(
              child: Transform.translate(
                offset: const Offset(0, -20),
                child: Container(
                  decoration: const BoxDecoration(
                    color: AppColors.background,
                    borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 28, 20, 120),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                              decoration: BoxDecoration(
                                color: AppColors.primary.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                property.type.displayName,
                                style: const TextStyle(color: AppColors.primary, fontSize: 12, fontWeight: FontWeight.w600),
                              ),
                            ),
                            const Spacer(),
                            const Icon(Icons.visibility_outlined, size: 16, color: AppColors.textMuted),
                            Text(' ${property.views}', style: Theme.of(context).textTheme.bodySmall),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Text(property.title, style: Theme.of(context).textTheme.headlineLarge),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            const Icon(Icons.location_on_outlined, size: 18, color: AppColors.accent),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                '${property.subCity}, ${property.city}, ${property.region}',
                                style: Theme.of(context).textTheme.bodyMedium,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),
                        Container(
                          padding: const EdgeInsets.all(20),
                          decoration: AppDecorations.card(),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('Monthly Rent', style: Theme.of(context).textTheme.bodySmall),
                                    const SizedBox(height: 4),
                                    Text(
                                      formatPrice(property.rentPrice),
                                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                                            color: AppColors.primary,
                                          ),
                                    ),
                                    if (property.isNegotiable)
                                      Text('Negotiable', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.success)),
                                  ],
                                ),
                              ),
                              if (property.depositAmount > 0)
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text('Deposit', style: Theme.of(context).textTheme.bodySmall),
                                    Text(formatPrice(property.depositAmount), style: Theme.of(context).textTheme.titleMedium),
                                  ],
                                ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 20),
                        Text('Features', style: Theme.of(context).textTheme.titleLarge),
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            _FeatureChip(icon: Icons.bed_outlined, label: '${property.bedrooms} Beds'),
                            _FeatureChip(icon: Icons.bathtub_outlined, label: '${property.bathrooms} Baths'),
                            if (property.parking) const _FeatureChip(icon: Icons.local_parking_rounded, label: 'Parking'),
                            if (property.furnished) const _FeatureChip(icon: Icons.chair_outlined, label: 'Furnished'),
                            if (property.petsAllowed) const _FeatureChip(icon: Icons.pets_rounded, label: 'Pets OK'),
                            if (property.balcony) const _FeatureChip(icon: Icons.balcony_rounded, label: 'Balcony'),
                            if (property.generator) const _FeatureChip(icon: Icons.bolt_rounded, label: 'Generator'),
                          ],
                        ),
                        const SizedBox(height: 24),
                        Text('Description', style: Theme.of(context).textTheme.titleLarge),
                        const SizedBox(height: 8),
                        Text(property.description, style: Theme.of(context).textTheme.bodyLarge),
                        const SizedBox(height: 24),
                        relatedAsync.when(
                          data: (related) => related.isEmpty
                              ? const SizedBox()
                              : Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('Similar Properties', style: Theme.of(context).textTheme.titleLarge),
                                    const SizedBox(height: 12),
                                    SizedBox(
                                      height: 300,
                                      child: ListView.builder(
                                        scrollDirection: Axis.horizontal,
                                        itemCount: related.length,
                                        itemBuilder: (_, i) => Padding(
                                          padding: const EdgeInsets.only(right: 14),
                                          child: PropertyCard(property: related[i]),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                          loading: () => const SizedBox(),
                          error: (_, __) => const SizedBox(),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
        bottomSheet: Container(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          decoration: BoxDecoration(
            color: AppColors.surface,
            boxShadow: AppDecorations.elevatedShadow,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: SafeArea(
            child: Row(
              children: [
                Expanded(
                  child: DelalaButton(
                    label: 'Call Owner',
                    icon: Icons.phone_rounded,
                    onPressed: () => launchUrl(Uri.parse('tel:${property.contactPhone}')),
                    fullWidth: true,
                  ),
                ),
                if (property.telegramUsername != null) ...[
                  const SizedBox(width: 12),
                  Expanded(
                    child: DelalaButton(
                      label: 'Telegram',
                      icon: Icons.telegram_rounded,
                      variant: DelalaButtonVariant.outline,
                      onPressed: () {
                        final username = property.telegramUsername!.replaceAll('@', '');
                        launchUrl(Uri.parse('https://t.me/$username'));
                      },
                      fullWidth: true,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _FeatureChip extends StatelessWidget {
  final IconData icon;
  final String label;
  const _FeatureChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppDecorations.radiusSm),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: AppColors.primary),
          const SizedBox(width: 6),
          Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}
