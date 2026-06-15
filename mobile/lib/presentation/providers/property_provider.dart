import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/dio_client.dart';
import '../../data/datasources/remote/property_remote_datasource.dart';
import '../../data/models/property_model.dart';

final propertyRemoteProvider = Provider<PropertyRemoteDataSource>((ref) {
  return PropertyRemoteDataSource(ref.watch(dioProvider));
});

final featuredPropertiesProvider = FutureProvider<List<PropertyModel>>((ref) async {
  return ref.watch(propertyRemoteProvider).getFeatured();
});

final newPropertiesProvider = FutureProvider<List<PropertyModel>>((ref) async {
  return ref.watch(propertyRemoteProvider).getNew();
});

final popularPropertiesProvider = FutureProvider<List<PropertyModel>>((ref) async {
  return ref.watch(propertyRemoteProvider).getPopular();
});

final popularAreasProvider = FutureProvider<List<PopularArea>>((ref) async {
  return ref.watch(propertyRemoteProvider).getAreas();
});

final propertyDetailProvider =
    FutureProvider.family<PropertyModel, String>((ref, id) async {
  return ref.watch(propertyRemoteProvider).getById(id);
});

final relatedPropertiesProvider =
    FutureProvider.family<List<PropertyModel>, String>((ref, id) async {
  return ref.watch(propertyRemoteProvider).getRelated(id);
});

final myListingsProvider = FutureProvider<List<PropertyModel>>((ref) async {
  return ref.watch(propertyRemoteProvider).getMyListings();
});

class SearchFilters {
  final String? propertyType;
  final num? minPrice;
  final num? maxPrice;
  final int? bedrooms;
  final String? subCity;
  final String sort;

  const SearchFilters({this.sort = 'newest', this.propertyType, this.minPrice, this.maxPrice, this.bedrooms, this.subCity});

  Map<String, dynamic> toQuery() {
    return {
      if (propertyType != null) 'propertyType': propertyType,
      if (minPrice != null) 'minPrice': minPrice,
      if (maxPrice != null) 'maxPrice': maxPrice,
      if (bedrooms != null) 'bedrooms': bedrooms,
      if (subCity != null) 'subCity': subCity,
      'sort': sort,
    };
  }

  SearchFilters copyWith({
    String? propertyType,
    num? minPrice,
    num? maxPrice,
    int? bedrooms,
    String? subCity,
    String? sort,
  }) {
    return SearchFilters(
      propertyType: propertyType ?? this.propertyType,
      minPrice: minPrice ?? this.minPrice,
      maxPrice: maxPrice ?? this.maxPrice,
      bedrooms: bedrooms ?? this.bedrooms,
      subCity: subCity ?? this.subCity,
      sort: sort ?? this.sort,
    );
  }
}

final searchFiltersProvider = StateProvider<SearchFilters>((ref) {
  return const SearchFilters();
});

final searchResultsProvider = FutureProvider<List<PropertyModel>>((ref) async {
  final filters = ref.watch(searchFiltersProvider);
  return ref.watch(propertyRemoteProvider).getList(filters.toQuery());
});
