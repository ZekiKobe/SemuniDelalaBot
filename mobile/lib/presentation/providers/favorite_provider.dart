import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/dio_client.dart';
import '../../data/datasources/remote/favorite_remote_datasource.dart';
import '../../data/models/property_model.dart';
import '../../data/models/unified_listing_model.dart';
import 'auth_provider.dart';

final favoriteRemoteProvider = Provider<FavoriteRemoteDataSource>((ref) {
  return FavoriteRemoteDataSource(ref.watch(dioProvider));
});

final favoritesProvider = FutureProvider<List<PropertyModel>>((ref) async {
  if (!ref.watch(authProvider).isAuthenticated) return [];
  return ref.watch(favoriteRemoteProvider).getAll();
});

final unifiedFavoritesProvider = FutureProvider<List<UnifiedListingModel>>((ref) async {
  if (!ref.watch(authProvider).isAuthenticated) return [];
  return ref.watch(favoriteRemoteProvider).getAllUnified();
});

final isFavoritedProvider = FutureProvider.family<bool, String>((ref, listingId) async {
  if (!ref.watch(authProvider).isAuthenticated) return false;
  return ref.watch(favoriteRemoteProvider).check(listingId);
});

class FavoritesNotifier extends StateNotifier<Set<String>> {
  final FavoriteRemoteDataSource _datasource;

  FavoritesNotifier(this._datasource) : super({});

  Future<void> _loadFavorites() async {
    try {
      final listings = await _datasource.getAllUnified();
      state = listings.map((l) => l.id).toSet();
    } catch (e) {
      // Silently fail if not authenticated or error
    }
  }

  void clear() {
    state = {};
  }

  Future<void> toggle(String listingId) async {
    try {
      if (state.contains(listingId)) {
        state = {...state}..remove(listingId);
        await _datasource.remove(listingId);
      } else {
        state = {...state, listingId};
        await _datasource.add(listingId);
      }
    } catch (e) {
      // Revert on error
      if (state.contains(listingId)) {
        state = {...state}..remove(listingId);
      } else {
        state = {...state, listingId};
      }
      rethrow;
    }
  }

  bool isFavorited(String listingId) {
    return state.contains(listingId);
  }

  void setFavorite(String listingId, bool isFavorite) {
    if (isFavorite) {
      state = {...state, listingId};
    } else {
      state = {...state}..remove(listingId);
    }
  }

  Future<void> refresh() async {
    await _loadFavorites();
  }
}

final favoritesNotifierProvider = StateNotifierProvider<FavoritesNotifier, Set<String>>((ref) {
  final notifier = FavoritesNotifier(ref.watch(favoriteRemoteProvider));

  ref.listen<AuthState>(authProvider, (previous, next) {
    if (next.isAuthenticated) {
      if (previous?.isAuthenticated != true) {
        notifier.refresh();
      }
    } else {
      notifier.clear();
    }
  }, fireImmediately: true);

  return notifier;
});
