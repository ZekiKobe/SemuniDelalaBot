import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/dio_client.dart';
import '../../data/datasources/remote/listing_remote_datasource.dart';
import '../../data/models/listing_model.dart';

final listingRemoteProvider = Provider<ListingRemoteDataSource>((ref) {
  return ListingRemoteDataSource(ref.watch(dioProvider));
});

final featuredListingsProvider = FutureProvider<List<ListingModel>>((ref) async {
  return ref.watch(listingRemoteProvider).getFeatured();
});

final newListingsProvider = FutureProvider<List<ListingModel>>((ref) async {
  return ref.watch(listingRemoteProvider).getNew();
});

final popularListingsProvider = FutureProvider<List<ListingModel>>((ref) async {
  return ref.watch(listingRemoteProvider).getPopular();
});

final listingDetailProvider =
    FutureProvider.family<ListingModel, String>((ref, id) async {
  return ref.watch(listingRemoteProvider).getById(id);
});
