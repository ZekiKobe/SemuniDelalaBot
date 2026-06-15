import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

/// Builds a [MultipartFile] from [XFile] — works on mobile, web, and desktop.
Future<MultipartFile> multipartFromXFile(XFile file) async {
  final bytes = await file.readAsBytes();
  return MultipartFile.fromBytes(
    bytes,
    filename: file.name.isNotEmpty ? file.name : 'image.jpg',
  );
}

/// Cross-platform image preview (uses bytes instead of [Image.file]).
class XFileImagePreview extends StatelessWidget {
  final XFile file;
  final BoxFit fit;
  final double? width;
  final double? height;
  final Widget? placeholder;

  const XFileImagePreview({
    super.key,
    required this.file,
    this.fit = BoxFit.cover,
    this.width,
    this.height,
    this.placeholder,
  });

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Uint8List>(
      future: file.readAsBytes(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return placeholder ??
              const Center(
                child: SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              );
        }
        if (snapshot.hasError || !snapshot.hasData) {
          return placeholder ??
              const Center(child: Icon(Icons.broken_image_outlined));
        }
        return Image.memory(
          snapshot.data!,
          fit: fit,
          width: width,
          height: height,
        );
      },
    );
  }
}
