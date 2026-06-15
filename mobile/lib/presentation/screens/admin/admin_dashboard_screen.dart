import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_decorations.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/network/dio_client.dart';
import '../../widgets/state_widgets.dart';

final adminDashboardProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final dio = ref.watch(dioProvider);
  final response = await dio.get(ApiConstants.adminDashboard);
  return response.data['data'] as Map<String, dynamic>;
});

class AdminDashboardScreen extends ConsumerWidget {
  const AdminDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboard = ref.watch(adminDashboardProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('Dashboard', style: Theme.of(context).textTheme.headlineMedium),
      ),
      body: dashboard.when(
        data: (data) {
          final users = data['users'] as Map<String, dynamic>? ?? {};
          final listings = data['listings'] as Map<String, dynamic>? ?? {};
          final revenue = data['revenue'] as Map<String, dynamic>? ?? {};
          final queues = data['queues'] as Map<String, dynamic>? ?? {};

          return RefreshIndicator(
            color: AppColors.primary,
            onRefresh: () async => ref.invalidate(adminDashboardProvider),
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: AppDecorations.heroCard(),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Total Revenue', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.white70)),
                      const SizedBox(height: 4),
                      Text(
                        '${revenue['totalRevenue'] ?? 0} ETB',
                        style: Theme.of(context).textTheme.displayMedium?.copyWith(color: Colors.white),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          _RevenuePill(label: 'Today', value: '${revenue['dailyRevenue'] ?? 0}'),
                          const SizedBox(width: 12),
                          _RevenuePill(label: 'Month', value: '${revenue['monthlyRevenue'] ?? 0}'),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                Text('Overview', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(child: _MetricCard(title: 'Users', value: '${users['total'] ?? 0}', icon: Icons.people_outline_rounded, color: AppColors.primary)),
                    const SizedBox(width: 12),
                    Expanded(child: _MetricCard(title: 'Active', value: '${listings['active'] ?? 0}', icon: Icons.home_work_outlined, color: AppColors.success)),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(child: _MetricCard(title: 'Pending', value: '${listings['pending'] ?? 0}', icon: Icons.pending_actions_rounded, color: AppColors.warning)),
                    const SizedBox(width: 12),
                    Expanded(child: _MetricCard(title: 'Expired', value: '${listings['expired'] ?? 0}', icon: Icons.timer_off_outlined, color: AppColors.textMuted)),
                  ],
                ),
                const SizedBox(height: 24),
                Text('Action Required', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 12),
                GestureDetector(
                  onTap: () => GoRouter.of(context).push('/admin/pending-approvals'),
                  child: _QueueCard(
                    icon: Icons.payment_rounded,
                    title: 'Pending Payments',
                    count: queues['pendingPayments'] ?? 0,
                    color: AppColors.accent,
                  ),
                ),
                const SizedBox(height: 10),
                _QueueCard(
                  icon: Icons.flag_rounded,
                  title: 'Pending Reports',
                  count: queues['pendingReports'] ?? 0,
                  color: AppColors.error,
                ),
              ],
            ),
          );
        },
        loading: () => const LoadingState(),
        error: (e, _) => ErrorState(
          message: e.toString(),
          onRetry: () => ref.invalidate(adminDashboardProvider),
        ),
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const _MetricCard({required this.title, required this.value, required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: AppDecorations.card(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 20, color: color),
          ),
          const SizedBox(height: 12),
          Text(value, style: Theme.of(context).textTheme.headlineMedium),
          Text(title, style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
    );
  }
}

class _RevenuePill extends StatelessWidget {
  final String label;
  final String value;

  const _RevenuePill({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text('$label: $value ETB', style: const TextStyle(color: Colors.white, fontSize: 12)),
    );
  }
}

class _QueueCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final int count;
  final Color color;

  const _QueueCard({required this.icon, required this.title, required this.count, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: AppDecorations.card(),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color),
          ),
          const SizedBox(width: 14),
          Expanded(child: Text(title, style: Theme.of(context).textTheme.titleMedium)),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: count > 0 ? color : AppColors.surfaceMuted,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              '$count',
              style: TextStyle(
                color: count > 0 ? Colors.white : AppColors.textMuted,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
