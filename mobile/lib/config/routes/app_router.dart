import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../presentation/providers/auth_provider.dart';
import '../../presentation/screens/auth/login_screen.dart';
import '../../presentation/screens/auth/register_screen.dart';
import '../../presentation/screens/home/home_screen.dart';
import '../../presentation/screens/search/search_screen.dart';
import '../../presentation/screens/property/property_detail_screen.dart';
import '../../presentation/screens/property/create_property_screen.dart';
import '../../presentation/screens/property/my_listings_screen.dart';
import '../../presentation/screens/payment/payment_screen.dart';
import '../../presentation/screens/favorites/favorites_screen.dart';
import '../../presentation/screens/profile/profile_screen.dart';
import '../../presentation/screens/admin/admin_dashboard_screen.dart';
import '../../presentation/screens/admin/pending_approvals_screen.dart';
import '../../presentation/screens/splash/splash_screen.dart';
import '../../presentation/screens/post_selection/post_selection_screen.dart';
import '../../presentation/screens/requirement/create_requirement_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/splash',
    redirect: (context, state) {
      final isAuth = authState.isAuthenticated;
      final isAuthRoute = state.matchedLocation == '/login' ||
          state.matchedLocation == '/register';
      final isSplash = state.matchedLocation == '/splash';

      if (isSplash) return null;

      if (!isAuth && _requiresAuth(state.matchedLocation)) {
        return '/login';
      }

      if (isAuth && isAuthRoute) {
        return '/';
      }

      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, __) => const SplashScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
      GoRoute(path: '/', builder: (_, __) => const HomeScreen()),
      GoRoute(path: '/search', builder: (_, __) => const SearchScreen()),
      GoRoute(
        path: '/property/:id',
        builder: (_, state) => PropertyDetailScreen(id: state.pathParameters['id']!),
      ),
      GoRoute(path: '/post-selection', builder: (_, __) => const PostSelectionScreen()),
      GoRoute(path: '/create-property', builder: (_, __) => const CreatePropertyScreen()),
      GoRoute(path: '/create-requirement', builder: (_, __) => const CreateRequirementScreen()),
      GoRoute(path: '/my-listings', builder: (_, __) => const MyListingsScreen()),
      GoRoute(
        path: '/payment/:propertyId',
        builder: (_, state) => PaymentScreen(propertyId: state.pathParameters['propertyId']!),
      ),
      GoRoute(path: '/favorites', builder: (_, __) => const FavoritesScreen()),
      GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
      GoRoute(path: '/admin', builder: (_, __) => const AdminDashboardScreen()),
      GoRoute(path: '/admin/pending-approvals', builder: (_, __) => const PendingApprovalsScreen()),
    ],
  );
});

bool _requiresAuth(String path) {
  const protected = ['/favorites', '/profile', '/post-selection', '/create-property', '/create-requirement', '/my-listings', '/admin'];
  return protected.any((p) => path.startsWith(p)) || path.startsWith('/payment');
}
