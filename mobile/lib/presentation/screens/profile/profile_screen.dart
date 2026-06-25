import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_decorations.dart';
import '../../../l10n/app_localizations.dart';
import '../../providers/auth_provider.dart';
import '../../providers/locale_provider.dart';
import '../../widgets/bottom_nav_bar.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  Future<void> _showLanguagePicker(BuildContext context, WidgetRef ref) async {
    final l10n = AppLocalizations.of(context)!;
    final selected = await showModalBottomSheet<String>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(l10n.languagePickerTitle, style: Theme.of(context).textTheme.titleLarge),
            ),
            ListTile(
              title: Text(l10n.english),
              trailing: ref.watch(localeProvider).languageCode == 'en'
                  ? const Icon(Icons.check_rounded, color: AppColors.primary)
                  : null,
              onTap: () => Navigator.pop(context, 'en'),
            ),
            ListTile(
              title: Text(l10n.amharic),
              trailing: ref.watch(localeProvider).languageCode == 'am'
                  ? const Icon(Icons.check_rounded, color: AppColors.primary)
                  : null,
              onTap: () => Navigator.pop(context, 'am'),
            ),
            ListTile(
              title: Text(l10n.oromo),
              trailing: ref.watch(localeProvider).languageCode == 'om'
                  ? const Icon(Icons.check_rounded, color: AppColors.primary)
                  : null,
              onTap: () => Navigator.pop(context, 'om'),
            ),
          ],
        ),
      ),
    );

    if (selected == null || !context.mounted) return;

    final authState = ref.read(authProvider);
    if (authState.isAuthenticated) {
      await ref.read(authProvider.notifier).updatePreferredLanguage(selected);
    } else {
      await ref.read(localeProvider.notifier).setLocale(selected);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final authState = ref.watch(authProvider);
    final user = authState.user;

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.profile, style: Theme.of(context).textTheme.headlineMedium),
      ),
      body: user == null
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.person_outline_rounded, size: 64, color: AppColors.textMuted),
                  const SizedBox(height: 16),
                  Text(l10n.signInToAccount, style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 20),
                  ElevatedButton(
                    onPressed: () => context.push('/login'),
                    child: Text(l10n.signIn),
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
                  title: l10n.myAccount,
                  items: [
                    _MenuItem(icon: Icons.home_work_outlined, label: l10n.myListings, onTap: () => context.push('/my-listings')),
                    _MenuItem(
                      icon: Icons.add_home_work_outlined,
                      label: l10n.listYourProperty,
                      subtitle: l10n.listYourPropertySubtitle,
                      onTap: () => context.push('/create-property'),
                    ),
                    if (user.isAdmin)
                      _MenuItem(icon: Icons.dashboard_outlined, label: l10n.adminDashboard, onTap: () => context.push('/admin'), accent: true),
                  ],
                ),
                const SizedBox(height: 16),
                _MenuSection(
                  title: l10n.preferences,
                  items: [
                    _MenuItem(
                      icon: Icons.language_rounded,
                      label: l10n.languageLabel,
                      trailing: ref.watch(localeProvider).languageCode.toUpperCase(),
                      onTap: () => _showLanguagePicker(context, ref),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                _MenuSection(
                  items: [
                    _MenuItem(
                      icon: Icons.logout_rounded,
                      label: l10n.signOut,
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
            child: Text(title!, style: Theme.of(context).textTheme.labelLarge?.copyWith(color: AppColors.textMuted)),
          ),
        ],
        Container(
          decoration: AppDecorations.card(),
          child: Column(
            children: items.map((item) {
              final isLast = item == items.last;
              return Column(
                children: [
                  item,
                  if (!isLast) Divider(height: 1, indent: 56, color: AppColors.border.withValues(alpha: 0.5)),
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
    final color = isDestructive ? AppColors.error : (accent ? AppColors.primary : AppColors.textPrimary);

    return ListTile(
      leading: Icon(icon, color: color),
      title: Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w600)),
      subtitle: subtitle != null ? Text(subtitle!) : null,
      trailing: trailing != null
          ? Text(trailing!, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.textMuted))
          : (onTap != null ? const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted) : null),
      onTap: onTap,
    );
  }
}
