import 'package:flutter/material.dart';
import '../../config/theme/app_colors.dart';
import '../../config/theme/app_decorations.dart';

enum DelalaButtonVariant { primary, accent, outline, ghost }

class DelalaButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;
  final DelalaButtonVariant variant;
  final IconData? icon;
  final bool fullWidth;

  const DelalaButton({
    super.key,
    required this.label,
    this.onPressed,
    this.isLoading = false,
    this.variant = DelalaButtonVariant.primary,
    this.icon,
    this.fullWidth = true,
  });

  @override
  Widget build(BuildContext context) {
    final child = isLoading
        ? const SizedBox(
            height: 22,
            width: 22,
            child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white),
          )
        : Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (icon != null) ...[Icon(icon, size: 20), const SizedBox(width: 8)],
              Text(label),
            ],
          );

    final button = switch (variant) {
      DelalaButtonVariant.primary => ElevatedButton(
          onPressed: isLoading ? null : onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            minimumSize: const Size(0, 52),
          ),
          child: child,
        ),
      DelalaButtonVariant.accent => ElevatedButton(
          onPressed: isLoading ? null : onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.accent,
            minimumSize: const Size(0, 52),
          ),
          child: child,
        ),
      DelalaButtonVariant.outline => OutlinedButton(
          onPressed: isLoading ? null : onPressed,
          style: OutlinedButton.styleFrom(minimumSize: const Size(0, 52)),
          child: child,
        ),
      DelalaButtonVariant.ghost => TextButton(
          onPressed: isLoading ? null : onPressed,
          child: child,
        ),
    };

    if (fullWidth) {
      return SizedBox(width: double.infinity, child: button);
    }
    return button;
  }
}

class DelalaIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onPressed;
  final Color? backgroundColor;
  final Color? iconColor;

  const DelalaIconButton({
    super.key,
    required this.icon,
    this.onPressed,
    this.backgroundColor,
    this.iconColor,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: backgroundColor ?? AppColors.surfaceMuted,
      borderRadius: BorderRadius.circular(AppDecorations.radiusSm),
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(AppDecorations.radiusSm),
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Icon(icon, size: 22, color: iconColor ?? AppColors.textPrimary),
        ),
      ),
    );
  }
}
