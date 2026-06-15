import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_decorations.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/bottom_nav_bar.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final user = authState.user;

    return Scaffold(
      appBar: AppBar(
        title: Text('Profile', style: Theme.of(context).textTheme.headlineMedium),
      ),
      body: user == null
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.person_outline_rounded, size: 64, color: AppColors.textMuted),
                  const SizedBox(height: 16),
                  Text('Sign in to your account', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 20),
                  ElevatedButton(
                    onPressed: () => context.push('/login'),
                    child: const Text('Sign In'),
                  ),
                ],
              ),
            )
          : ListView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 100),
              children: [
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: AppDecorations.card(),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 36,
                        backgroundColor: AppColors.primary.withValues(alpha: 0.12),
                        child: Text(
                          user.fullName.isNotEmpty ? user.fullName[0].toUpperCase() : '?',
                          style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w700, color: AppColors.primary),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(user.fullName, style: Theme.of(context).textTheme.titleLarge),
                            const SizedBox(height: 4),
                            Text(user.phoneNumber, style: Theme.of(context).textTheme.bodyMedium),
                            if (user.email != null) Text(user.email!, style: Theme.of(context).textTheme.bodySmall),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                _MenuSection(
                  title: 'My Account',
                  items: [
                    _MenuItem(icon: Icons.home_work_outlined, label: 'My Listings', onTap: () => context.push('/my-listings')),
                    _MenuItem(
                      icon: Icons.add_home_work_outlined,
                      label: 'List Your Property',
                      subtitle: 'For owners & landlords',
                      onTap: () => context.push('/create-property'),
                    ),
                    if (user.isAdmin)
                      _MenuItem(icon: Icons.dashboard_outlined, label: 'Admin Dashboard', onTap: () => context.push('/admin'), accent: true),
                  ],
                ),
                const SizedBox(height: 16),
                _MenuSection(
                  title: 'Preferences',
                  items: [
                    _MenuItem(icon: Icons.language_rounded, label: 'Language', trailing: user.preferredLanguage.toUpperCase()),
                  ],
                ),
                const SizedBox(height: 16),
                _MenuSection(
                  items: [
                    _MenuItem(
                      icon: Icons.logout_rounded,
                      label: 'Sign Out',
                      isDestructive: true,
                      onTap: () async {
                        await ref.read(authProvider.notifier).logout();
                        if (context.mounted) context.go('/login');
                      },
                    ),
                  ],
                ),
              ],
            ),
      bottomNavigationBar: const DelalaBottomNav(currentIndex: 3),
    );
  }
}

class _MenuSection extends StatelessWidget {
  final String? title;
  final List<_MenuItem> items;

  const _MenuSection({this.title, required this.items});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (title != null) ...[
          Padding(
            padding: const EdgeInsets.only(left: 4, bottom: 8),
            child: Text(title!, style: Theme.of(context).textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600)),
          ),
        ],
        Container(
          decoration: AppDecorations.card(),
          child: Column(
            children: items.asMap().entries.map((entry) {
              final isLast = entry.key == items.length - 1;
              return Column(
                children: [
                  entry.value,
                  if (!isLast) const Divider(height: 1, indent: 56),
                ],
              );
            }).toList(),
          ),
        ),
      ],
    );
  }
}

class _MenuItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String? subtitle;
  final String? trailing;
  final VoidCallback? onTap;
  final bool isDestructive;
  final bool accent;

  const _MenuItem({
    required this.icon,
    required this.label,
    this.subtitle,
    this.trailing,
    this.onTap,
    this.isDestructive = false,
    this.accent = false,
  });

  @override
  Widget build(BuildContext context) {
    final color = isDestructive ? AppColors.error : accent ? AppColors.accent : AppColors.textPrimary;

    return ListTile(
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: (isDestructive ? AppColors.error : accent ? AppColors.accent : AppColors.primary)
              .withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, size: 20, color: color),
      ),
      title: Text(label, style: TextStyle(fontWeight: FontWeight.w500, color: color)),
      subtitle: subtitle != null ? Text(subtitle!, style: Theme.of(context).textTheme.bodySmall) : null,
      trailing: trailing != null
          ? Text(trailing!, style: Theme.of(context).textTheme.bodySmall)
          : onTap != null
              ? const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted)
              : null,
      onTap: onTap,
    );
  }
}
