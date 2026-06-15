import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/utils/formatters.dart';
import '../../data/models/property_model.dart';
import '../../config/theme/app_colors.dart';
import '../../config/theme/app_decorations.dart';

class PropertyCard extends StatelessWidget {
  final PropertyModel property;
  final double? width;
  final bool isHorizontal;

  const PropertyCard({
    super.key,
    required this.property,
    this.width,
    this.isHorizontal = false,
  });

  @override
  Widget build(BuildContext context) {
    if (isHorizontal) {
      return _HorizontalCard(property: property);
    }
    return SizedBox(
      width: width ?? 260,
      child: _VerticalCard(property: property),
    );
  }
}

class _VerticalCard extends StatelessWidget {
  final PropertyModel property;
  const _VerticalCard({required this.property});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/property/${property.id}'),
      child: Container(
        decoration: AppDecorations.card(),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                AspectRatio(
                  aspectRatio: 4 / 3,
                  child: _PropertyImage(url: property.primaryImage),
                ),
                Positioned(
                  top: 10,
                  left: 10,
                  child: _TypeBadge(label: property.type.displayName),
                ),
                if (property.furnished)
                  const Positioned(
                    top: 10,
                    right: 10,
                    child: _FeatureBadge(icon: Icons.chair_outlined, label: 'Furnished'),
                  ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    property.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.location_on_outlined, size: 14, color: AppColors.textMuted),
                      const SizedBox(width: 2),
                      Expanded(
                        child: Text(
                          '${property.subCity}, ${property.city}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        formatPrice(property.rentPrice),
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              color: AppColors.primary,
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                      _RoomInfo(bedrooms: property.bedrooms, bathrooms: property.bathrooms),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _HorizontalCard extends StatelessWidget {
  final PropertyModel property;
  const _HorizontalCard({required this.property});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/property/${property.id}'),
      child: Container(
        decoration: AppDecorations.card(),
        clipBehavior: Clip.antiAlias,
        child: Row(
          children: [
            SizedBox(
              width: 120,
              height: 110,
              child: _PropertyImage(url: property.primaryImage),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      property.title.isNotEmpty ? property.title : 'Untitled Property',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(fontSize: 15),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${property.subCity.isNotEmpty ? property.subCity : ''}, ${property.city.isNotEmpty ? property.city : ''}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          formatPrice(property.rentPrice),
                          style: const TextStyle(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w700,
                            fontSize: 15,
                          ),
                        ),
                        _RoomInfo(bedrooms: property.bedrooms, bathrooms: property.bathrooms),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PropertyImage extends StatelessWidget {
  final String? url;
  const _PropertyImage({this.url});

  @override
  Widget build(BuildContext context) {
    if (url != null) {
      return CachedNetworkImage(
        imageUrl: url!,
        fit: BoxFit.cover,
        placeholder: (_, __) => Container(color: AppColors.surfaceMuted),
        errorWidget: (_, __, ___) => const _PlaceholderImage(),
      );
    }
    return const _PlaceholderImage();
  }
}

class _PlaceholderImage extends StatelessWidget {
  const _PlaceholderImage();

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.surfaceMuted,
      child: const Center(
        child: Icon(Icons.home_work_outlined, size: 40, color: AppColors.textMuted),
      ),
    );
  }
}

class _TypeBadge extends StatelessWidget {
  final String label;
  const _TypeBadge({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: AppColors.cardOverlay,
        borderRadius: BorderRadius.circular(AppDecorations.radiusSm),
      ),
      child: Text(
        label,
        style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
      ),
    );
  }
}

class _FeatureBadge extends StatelessWidget {
  final IconData icon;
  final String label;
  const _FeatureBadge({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.gold.withValues(alpha: 0.9),
        borderRadius: BorderRadius.circular(AppDecorations.radiusSm),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: Colors.white),
          const SizedBox(width: 3),
          Text(label, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

class _RoomInfo extends StatelessWidget {
  final int bedrooms;
  final int bathrooms;
  const _RoomInfo({required this.bedrooms, required this.bathrooms});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const Icon(Icons.bed_outlined, size: 15, color: AppColors.textMuted),
        Text(' $bedrooms', style: Theme.of(context).textTheme.bodySmall),
        const SizedBox(width: 8),
        const Icon(Icons.bathtub_outlined, size: 15, color: AppColors.textMuted),
        Text(' $bathrooms', style: Theme.of(context).textTheme.bodySmall),
      ],
    );
  }
}
