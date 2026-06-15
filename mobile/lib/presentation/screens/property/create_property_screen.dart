import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_decorations.dart';
import '../../../core/utils/image_utils.dart';
import '../../../core/utils/phone_validator.dart';
import '../../../domain/enums/property_type.dart';
import '../../providers/property_provider.dart';
import '../../widgets/delala_button.dart';

class CreatePropertyScreen extends ConsumerStatefulWidget {
  const CreatePropertyScreen({super.key});

  @override
  ConsumerState<CreatePropertyScreen> createState() => _CreatePropertyScreenState();
}

class _CreatePropertyScreenState extends ConsumerState<CreatePropertyScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _rentController = TextEditingController();
  final _phoneController = TextEditingController();
  final _landmarkController = TextEditingController();

  PropertyType _propertyType = PropertyType.apartment;
  String _subCity = 'Bole';
  int _bedrooms = 1;
  int _bathrooms = 1;
  bool _parking = false;
  bool _furnished = false;
  final List<XFile> _images = [];
  bool _isSubmitting = false;
  int _currentStep = 0;

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _rentController.dispose();
    _phoneController.dispose();
    _landmarkController.dispose();
    super.dispose();
  }

  Future<void> _pickImages() async {
    final picker = ImagePicker();
    final files = await picker.pickMultiImage();
    if (files.isNotEmpty) {
      setState(() {
        _images.addAll(files);
        if (_images.length > 20) _images.removeRange(20, _images.length);
      });
    }
  }

  void _removeImage(int index) {
    setState(() => _images.removeAt(index));
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);

    try {
      final remote = ref.read(propertyRemoteProvider);
      final property = await remote.create({
        'title': _titleController.text.trim(),
        'description': _descriptionController.text.trim(),
        'propertyType': _propertyType.apiValue,
        'rentPrice': num.parse(_rentController.text),
        'region': 'Addis Ababa',
        'city': 'Addis Ababa',
        'subCity': _subCity,
        'landmark': _landmarkController.text.trim(),
        'bedrooms': _bedrooms,
        'bathrooms': _bathrooms,
        'parking': _parking,
        'furnished': _furnished,
        'contactPhone': normalizeEthiopianPhone(_phoneController.text),
      });

      if (_images.isNotEmpty) {
        final multipartFiles = await Future.wait(
          _images.map(multipartFromXFile),
        );
        await remote.uploadImages(property.id, multipartFiles);
      }

      await remote.submit(property.id);

      if (mounted) context.push('/payment/${property.id}');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e')));
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('List Your Property', style: Theme.of(context).textTheme.headlineMedium),
      ),
      body: Form(
        key: _formKey,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
              child: Row(
                children: List.generate(3, (i) {
                  return Expanded(
                    child: Container(
                      margin: EdgeInsets.only(right: i < 2 ? 8 : 0),
                      height: 4,
                      decoration: BoxDecoration(
                        color: i <= _currentStep ? AppColors.primary : AppColors.border,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  );
                }),
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  if (_currentStep == 0) ...[
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(AppDecorations.radiusMd),
                        border: Border.all(color: AppColors.primary.withValues(alpha: 0.15)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.home_work_outlined, color: AppColors.primary),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'Own a house, apartment, or room? List it here and reach thousands of renters across Ethiopia.',
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                    color: AppColors.primary,
                                  ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text('Basic Info', style: Theme.of(context).textTheme.titleLarge),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _titleController,
                      decoration: AppDecorations.inputDecoration(label: 'Property Title', prefixIcon: Icons.title_rounded),
                      validator: (v) => v == null || v.length < 5 ? 'Min 5 characters' : null,
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _descriptionController,
                      maxLines: 4,
                      decoration: AppDecorations.inputDecoration(label: 'Description', prefixIcon: Icons.description_outlined),
                      validator: (v) => v == null || v.length < 20 ? 'Min 20 characters' : null,
                    ),
                    const SizedBox(height: 14),
                    DropdownButtonFormField<PropertyType>(
                      initialValue: _propertyType,
                      decoration: AppDecorations.inputDecoration(label: 'Property Type'),
                      items: PropertyType.values
                          .map((t) => DropdownMenuItem(value: t, child: Text(t.displayName)))
                          .toList(),
                      onChanged: (v) => setState(() => _propertyType = v!),
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _rentController,
                      keyboardType: TextInputType.number,
                      decoration: AppDecorations.inputDecoration(label: 'Monthly Rent (ETB)', prefixIcon: Icons.payments_outlined),
                      validator: (v) => v == null || int.tryParse(v) == null ? 'Enter valid amount' : null,
                    ),
                  ],
                  if (_currentStep == 1) ...[
                    Text('Location & Features', style: Theme.of(context).textTheme.titleLarge),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      initialValue: _subCity,
                      decoration: AppDecorations.inputDecoration(label: 'Sub City', prefixIcon: Icons.location_on_outlined),
                      items: ['Bole', 'CMC', 'Summit', 'Ayat', 'Gerji', 'Megenagna', 'Sarbet', 'Kazanchis']
                          .map((a) => DropdownMenuItem(value: a, child: Text(a)))
                          .toList(),
                      onChanged: (v) => setState(() => _subCity = v!),
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _landmarkController,
                      decoration: AppDecorations.inputDecoration(label: 'Landmark', prefixIcon: Icons.place_outlined),
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<int>(
                            initialValue: _bedrooms,
                            decoration: AppDecorations.inputDecoration(label: 'Bedrooms'),
                            items: List.generate(6, (i) => DropdownMenuItem(value: i, child: Text('$i'))),
                            onChanged: (v) => setState(() => _bedrooms = v!),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: DropdownButtonFormField<int>(
                            initialValue: _bathrooms,
                            decoration: AppDecorations.inputDecoration(label: 'Bathrooms'),
                            items: List.generate(5, (i) => DropdownMenuItem(value: i, child: Text('$i'))),
                            onChanged: (v) => setState(() => _bathrooms = v!),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    _ToggleRow(label: 'Parking', value: _parking, onChanged: (v) => setState(() => _parking = v)),
                    _ToggleRow(label: 'Furnished', value: _furnished, onChanged: (v) => setState(() => _furnished = v)),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      decoration: AppDecorations.inputDecoration(label: 'Contact Phone', prefixIcon: Icons.phone_outlined),
                      validator: (v) => v == null || !isValidEthiopianPhone(v) ? 'Invalid phone' : null,
                    ),
                  ],
                  if (_currentStep == 2) ...[
                    Text('Photos (Optional)', style: Theme.of(context).textTheme.titleLarge),
                    const SizedBox(height: 8),
                    Text(
                      'Photos help your listing get more views. You can add up to 20, or skip and add them later.',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    const SizedBox(height: 16),
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 3,
                        crossAxisSpacing: 10,
                        mainAxisSpacing: 10,
                      ),
                      itemCount: _images.length + 1,
                      itemBuilder: (_, i) {
                        if (i == _images.length) {
                          return GestureDetector(
                            onTap: _images.length < 20 ? _pickImages : null,
                            child: Container(
                              decoration: BoxDecoration(
                                color: AppColors.surfaceMuted,
                                borderRadius: BorderRadius.circular(AppDecorations.radiusSm),
                                border: Border.all(color: AppColors.border),
                              ),
                              child: Icon(
                                Icons.add_a_photo_outlined,
                                color: _images.length < 20 ? AppColors.textMuted : AppColors.border,
                              ),
                            ),
                          );
                        }
                        return Stack(
                          fit: StackFit.expand,
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(AppDecorations.radiusSm),
                              child: XFileImagePreview(file: _images[i], fit: BoxFit.cover),
                            ),
                            Positioned(
                              top: 4,
                              right: 4,
                              child: GestureDetector(
                                onTap: () => _removeImage(i),
                                child: Container(
                                  padding: const EdgeInsets.all(4),
                                  decoration: const BoxDecoration(
                                    color: Colors.black54,
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(Icons.close, size: 14, color: Colors.white),
                                ),
                              ),
                            ),
                          ],
                        );
                      },
                    ),
                    if (_images.isEmpty) ...[
                      const SizedBox(height: 16),
                      OutlinedButton.icon(
                        onPressed: _pickImages,
                        icon: const Icon(Icons.photo_library_outlined),
                        label: const Text('Add Photos'),
                      ),
                    ],
                  ],
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  if (_currentStep > 0)
                    Expanded(
                      child: DelalaButton(
                        label: 'Back',
                        variant: DelalaButtonVariant.outline,
                        onPressed: () => setState(() => _currentStep--),
                      ),
                    ),
                  if (_currentStep > 0) const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: DelalaButton(
                      label: _currentStep < 2
                          ? 'Continue'
                          : 'Publish',
                      variant: _currentStep < 2 ? DelalaButtonVariant.primary : DelalaButtonVariant.accent,
                      isLoading: _isSubmitting,
                      onPressed: () {
                        if (_currentStep < 2) {
                          if (_currentStep == 0 && !_formKey.currentState!.validate()) return;
                          setState(() => _currentStep++);
                        } else {
                          _submit();
                        }
                      },
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ToggleRow extends StatelessWidget {
  final String label;
  final bool value;
  final ValueChanged<bool> onChanged;

  const _ToggleRow({required this.label, required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 4),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppDecorations.radiusSm),
        border: Border.all(color: AppColors.border),
      ),
      child: SwitchListTile(
        title: Text(label, style: const TextStyle(fontWeight: FontWeight.w500)),
        value: value,
        activeThumbColor: AppColors.primary,
        onChanged: onChanged,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppDecorations.radiusSm)),
      ),
    );
  }
}
