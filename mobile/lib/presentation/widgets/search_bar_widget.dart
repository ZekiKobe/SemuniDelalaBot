import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../config/theme/app_colors.dart';
import '../../config/theme/app_decorations.dart';

class SearchBarWidget extends StatelessWidget {
  const SearchBarWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Material(
        color: AppColors.surface,
        elevation: 0,
        borderRadius: BorderRadius.circular(AppDecorations.radiusMd),
        child: InkWell(
          onTap: () => context.push('/search'),
          borderRadius: BorderRadius.circular(AppDecorations.radiusMd),
          child: Ink(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(AppDecorations.radiusMd),
              border: Border.all(color: AppColors.border),
              boxShadow: AppDecorations.cardShadow,
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.search, color: AppColors.primary, size: 20),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Text(
                      'Search area, property type...',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: AppColors.textMuted,
                          ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceMuted,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.tune_rounded, color: AppColors.textSecondary, size: 18),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
