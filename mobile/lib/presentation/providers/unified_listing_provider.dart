import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/dio_client.dart';
import '../../data/datasources/remote/unified_listing_remote_datasource.dart';
import '../../data/models/unified_listing_model.dart';

final unifiedListingRemoteProvider = Provider<UnifiedListingRemoteDataSource>((ref) {
  return UnifiedListingRemoteDataSource(ref.watch(dioProvider));
});

final forRentListingsProvider = FutureProvider<List<UnifiedListingModel>>((ref) async {
  return ref.watch(unifiedListingRemoteProvider).getForRent(limit: 20);
});

final forSaleListingsProvider = FutureProvider<List<UnifiedListingModel>>((ref) async {
  return ref.watch(unifiedListingRemoteProvider).getForSale(limit: 20);
});

final marketplaceListingsProvider = FutureProvider<List<UnifiedListingModel>>((ref) async {
  return ref.watch(unifiedListingRemoteProvider).getMarketplace(limit: 20);
});

final featuredUnifiedListingsProvider = FutureProvider<List<UnifiedListingModel>>((ref) async {
  return ref.watch(unifiedListingRemoteProvider).getFeatured(limit: 10);
});
