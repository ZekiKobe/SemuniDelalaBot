import 'package:flutter/material.dart';

class AppColors {
  // Brand — Ethiopian warmth meets modern marketplace
  static const Color primary = Color(0xFF0B3D2E);
  static const Color primaryLight = Color(0xFF1A6B4F);
  static const Color primaryDark = Color(0xFF062A1F);
  static const Color accent = Color(0xFFE8623A);
  static const Color accentLight = Color(0xFFFF8A65);
  static const Color gold = Color(0xFFC9A227);

  // Surfaces
  static const Color background = Color(0xFFF7F4EF);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceMuted = Color(0xFFF0EDE8);
  static const Color cardOverlay = Color(0x99000000);

  // Text
  static const Color textPrimary = Color(0xFF1C1917);
  static const Color textSecondary = Color(0xFF78716C);
  static const Color textMuted = Color(0xFFA8A29E);
  static const Color textOnPrimary = Color(0xFFFFFFFF);

  // Utility
  static const Color border = Color(0xFFE7E5E4);
  static const Color divider = Color(0xFFF0EDE8);
  static const Color success = Color(0xFF16A34A);
  static const Color error = Color(0xFFDC2626);
  static const Color warning = Color(0xFFF59E0B);

  // Gradients
  static const LinearGradient primaryGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF0B3D2E), Color(0xFF1A6B4F), Color(0xFF2D8B6F)],
  );

  static const LinearGradient heroGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF062A1F), Color(0xFF0B3D2E), Color(0xFF1A6B4F)],
  );

  static const LinearGradient accentGradient = LinearGradient(
    colors: [Color(0xFFE8623A), Color(0xFFFF8A65)],
  );

  static const LinearGradient splashGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0xFF062A1F), Color(0xFF0B3D2E), Color(0xFF134D38)],
  );
}
