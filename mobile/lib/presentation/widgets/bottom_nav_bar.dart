import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../config/theme/app_colors.dart';
import '../../config/theme/app_decorations.dart';
import '../../l10n/app_localizations.dart';

class DelalaBottomNav extends StatefulWidget {
  final int currentIndex;

  const DelalaBottomNav({super.key, required this.currentIndex});

  @override
  State<DelalaBottomNav> createState() => _DelalaBottomNavState();
}

class _DelalaBottomNavState extends State<DelalaBottomNav> with SingleTickerProviderStateMixin {
  late AnimationController _animationController;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return Container(
      margin: const EdgeInsets.fromLTRB(20, 0, 20, 20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.12),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: NavigationBar(
          height: 70,
          elevation: 0,
          backgroundColor: Colors.transparent,
          indicatorColor: AppColors.primary.withValues(alpha: 0.1),
          selectedIndex: widget.currentIndex,
          labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
          animationDuration: const Duration(milliseconds: 400),
          onDestinationSelected: (index) {
            _animationController.forward(from: 0);
            switch (index) {
              case 0:
                context.go('/');
              case 1:
                context.go('/search');
              case 2:
                context.go('/favorites');
              case 3:
                context.go('/profile');
            }
          },
          destinations: [
            NavigationDestination(
              icon: AnimatedSwitcher(
                duration: const Duration(milliseconds: 200),
                child: Icon(
                  Icons.home_outlined,
                  key: ValueKey(widget.currentIndex == 0),
                  color: widget.currentIndex == 0 ? AppColors.primary : AppColors.textMuted,
                ),
              ),
              selectedIcon: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.home_rounded, color: AppColors.primary),
              ),
              label: l10n.home,
            ),
            NavigationDestination(
              icon: AnimatedSwitcher(
                duration: const Duration(milliseconds: 200),
                child: Icon(
                  Icons.search_rounded,
                  key: ValueKey(widget.currentIndex == 1),
                  color: widget.currentIndex == 1 ? AppColors.primary : AppColors.textMuted,
                ),
              ),
              selectedIcon: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.search_rounded, color: AppColors.primary),
              ),
              label: l10n.search,
            ),
            NavigationDestination(
              icon: AnimatedSwitcher(
                duration: const Duration(milliseconds: 200),
                child: Icon(
                  Icons.favorite_border_rounded,
                  key: ValueKey(widget.currentIndex == 2),
                  color: widget.currentIndex == 2 ? AppColors.primary : AppColors.textMuted,
                ),
              ),
              selectedIcon: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.accent.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.favorite_rounded, color: AppColors.accent),
              ),
              label: l10n.saved,
            ),
            NavigationDestination(
              icon: AnimatedSwitcher(
                duration: const Duration(milliseconds: 200),
                child: Icon(
                  Icons.person_outline_rounded,
                  key: ValueKey(widget.currentIndex == 3),
                  color: widget.currentIndex == 3 ? AppColors.primary : AppColors.textMuted,
                ),
              ),
              selectedIcon: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.person_rounded, color: AppColors.primary),
              ),
              label: l10n.profile,
            ),
          ],
        ),
      ),
    );
  }
}
