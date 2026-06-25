import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../config/theme/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../providers/locale_provider.dart';

// Track if splash has been shown in this app session
bool _splashShown = false;

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeAnim;
  late Animation<double> _scaleAnim;

  @override
  void initState() {
    super.initState();
    
    // If splash was already shown this session, skip it immediately
    if (_splashShown) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        final isAuth = ref.read(authProvider).isAuthenticated;
        context.go(isAuth ? '/' : '/login');
      });
      _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 1));
      _fadeAnim = Tween<double>(begin: 1, end: 1).animate(_controller);
      _scaleAnim = Tween<double>(begin: 1, end: 1).animate(_controller);
      return;
    }
    
    // First time showing splash this session
    _splashShown = true;
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 1200));
    _fadeAnim = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0, 0.6, curve: Curves.easeOut)),
    );
    _scaleAnim = Tween<double>(begin: 0.8, end: 1).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0, 0.6, curve: Curves.easeOutBack)),
    );
    _controller.forward();

    Future.delayed(const Duration(milliseconds: 1500), () {
      if (!mounted) return;
      final isAuth = ref.read(authProvider).isAuthenticated;
      context.go(isAuth ? '/' : '/');
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: AppColors.splashGradient),
        child: Center(
          child: AnimatedBuilder(
            animation: _controller,
            builder: (_, child) => Opacity(
              opacity: _fadeAnim.value,
              child: Transform.scale(scale: _scaleAnim.value, child: child),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(28),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(28),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.2),
                        blurRadius: 40,
                        offset: const Offset(0, 16),
                      ),
                    ],
                  ),
                  child: const Icon(Icons.home_work_rounded, size: 56, color: AppColors.primary),
                ),
                const SizedBox(height: 32),
                Text(
                  'Delala',
                  style: Theme.of(context).textTheme.displayMedium?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                      ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Ethiopian House Rental Marketplace',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Colors.white.withValues(alpha: 0.7),
                      ),
                ),
                const SizedBox(height: 48),
                SizedBox(
                  width: 32,
                  height: 32,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.5,
                    color: Colors.white.withValues(alpha: 0.8),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
