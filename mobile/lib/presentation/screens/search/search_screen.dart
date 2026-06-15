import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_decorations.dart';
import '../../../domain/enums/property_type.dart';
import '../../providers/property_provider.dart';
import '../../widgets/bottom_nav_bar.dart';
import '../../widgets/property_card.dart';
import '../../widgets/state_widgets.dart';

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final filters = ref.watch(searchFiltersProvider);
    final results = ref.watch(searchResultsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('Search', style: Theme.of(context).textTheme.headlineMedium),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: IconButton(
              onPressed: () => _showFilterSheet(context, ref, filters),
              style: IconButton.styleFrom(backgroundColor: AppColors.surfaceMuted),
              icon: const Icon(Icons.tune_rounded, size: 22),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
            child: TextField(
              controller: _searchController,
              decoration: AppDecorations.inputDecoration(
                label: 'Search',
                hint: 'Area, keyword, property type...',
                prefixIcon: Icons.search_rounded,
              ),
              onSubmitted: (value) {
                ref.read(searchFiltersProvider.notifier).state =
                    filters.copyWith(subCity: value.isEmpty ? null : value);
                ref.invalidate(searchResultsProvider);
              },
            ),
          ),
          if (filters.propertyType != null || filters.bedrooms != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
              child: Row(
                children: [
                  if (filters.subCity != null)
                    _ActiveFilterChip(
                      label: filters.subCity!,
                      onRemove: () {
                        ref.read(searchFiltersProvider.notifier).state =
                            filters.copyWith(subCity: null);
                        ref.invalidate(searchResultsProvider);
                      },
                    ),
                  if (filters.propertyType != null) ...[
                    const SizedBox(width: 8),
                    _ActiveFilterChip(
                      label: filters.propertyType!,
                      onRemove: () {
                        ref.read(searchFiltersProvider.notifier).state =
                            filters.copyWith(propertyType: null);
                        ref.invalidate(searchResultsProvider);
                      },
                    ),
                  ],
                ],
              ),
            ),
          Expanded(
            child: results.when(
              data: (properties) => properties.isEmpty
                  ? const EmptyState(
                      icon: Icons.search_off_rounded,
                      title: 'No properties found',
                      subtitle: 'Try adjusting your filters or search terms',
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 100),
                      itemCount: properties.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (_, i) => PropertyCard(
                        property: properties[i],
                        width: double.infinity,
                        isHorizontal: true,
                      ),
                    ),
              loading: () => const LoadingState(message: 'Searching properties...'),
              error: (e, _) => ErrorState(
                message: e.toString(),
                onRetry: () => ref.invalidate(searchResultsProvider),
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: const DelalaBottomNav(currentIndex: 1),
    );
  }

  void _showFilterSheet(BuildContext context, WidgetRef ref, SearchFilters filters) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => _FilterSheet(
        filters: filters,
        onApply: (newFilters) {
          ref.read(searchFiltersProvider.notifier).state = newFilters;
          ref.invalidate(searchResultsProvider);
          Navigator.pop(ctx);
        },
      ),
    );
  }
}

class _ActiveFilterChip extends StatelessWidget {
  final String label;
  final VoidCallback onRemove;

  const _ActiveFilterChip({required this.label, required this.onRemove});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.primary.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(label, style: const TextStyle(color: AppColors.primary, fontSize: 13, fontWeight: FontWeight.w500)),
          const SizedBox(width: 4),
          GestureDetector(
            onTap: onRemove,
            child: const Icon(Icons.close, size: 16, color: AppColors.primary),
          ),
        ],
      ),
    );
  }
}

class _FilterSheet extends StatefulWidget {
  final SearchFilters filters;
  final ValueChanged<SearchFilters> onApply;

  const _FilterSheet({required this.filters, required this.onApply});

  @override
  State<_FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends State<_FilterSheet> {
  late String? propertyType;
  late int? bedrooms;
  late String sort;

  @override
  void initState() {
    super.initState();
    propertyType = widget.filters.propertyType;
    bedrooms = widget.filters.bedrooms;
    sort = widget.filters.sort;
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(24, 24, 24, MediaQuery.of(context).padding.bottom + 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 20),
          Text('Filters', style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 20),
          DropdownButtonFormField<String?>(
            initialValue: propertyType,
            decoration: AppDecorations.inputDecoration(label: 'Property Type'),
            items: [
              const DropdownMenuItem(value: null, child: Text('All types')),
              ...PropertyType.values.map(
                (t) => DropdownMenuItem(value: t.apiValue, child: Text(t.displayName)),
              ),
            ],
            onChanged: (v) => setState(() => propertyType = v),
          ),
          const SizedBox(height: 14),
          DropdownButtonFormField<int?>(
            initialValue: bedrooms,
            decoration: AppDecorations.inputDecoration(label: 'Bedrooms'),
            items: [null, 1, 2, 3, 4, 5].map((b) {
              return DropdownMenuItem(value: b, child: Text(b == null ? 'Any' : '$b+'));
            }).toList(),
            onChanged: (v) => setState(() => bedrooms = v),
          ),
          const SizedBox(height: 14),
          DropdownButtonFormField<String>(
            initialValue: sort,
            decoration: AppDecorations.inputDecoration(label: 'Sort By'),
            items: const [
              DropdownMenuItem(value: 'newest', child: Text('Newest')),
              DropdownMenuItem(value: 'oldest', child: Text('Oldest')),
              DropdownMenuItem(value: 'price_asc', child: Text('Lowest Price')),
              DropdownMenuItem(value: 'price_desc', child: Text('Highest Price')),
              DropdownMenuItem(value: 'views', child: Text('Most Viewed')),
              DropdownMenuItem(value: 'favorites', child: Text('Most Favorited')),
            ],
            onChanged: (v) => setState(() => sort = v ?? 'newest'),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () => widget.onApply(widget.filters.copyWith(
              propertyType: propertyType,
              bedrooms: bedrooms,
              sort: sort,
            )),
            child: const Text('Apply Filters'),
          ),
        ],
      ),
    );
  }
}
