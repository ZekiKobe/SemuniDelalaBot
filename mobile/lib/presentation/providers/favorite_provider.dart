import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/dio_client.dart';
import '../../data/datasources/remote/favorite_remote_datasource.dart';
import '../../data/models/property_model.dart';

final favoriteRemoteProvider = Provider<FavoriteRemoteDataSource>((ref) {
  return FavoriteRemoteDataSource(ref.watch(dioProvider));
});

final favoritesProvider = FutureProvider<List<PropertyModel>>((ref) async {
  return ref.watch(favoriteRemoteProvider).getAll();
});

final isFavoritedProvider = FutureProvider.family<bool, String>((ref, propertyId) async {
  return ref.watch(favoriteRemoteProvider).check(propertyId);
});
