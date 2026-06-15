import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../config/theme/app_colors.dart';
import '../../../config/theme/app_decorations.dart';
import '../../../core/utils/phone_validator.dart';
import '../../widgets/delala_button.dart';

class CreateRequirementScreen extends ConsumerStatefulWidget {
  const CreateRequirementScreen({super.key});

  @override
  ConsumerState<CreateRequirementScreen> createState() => _CreateRequirementScreenState();
}

class _CreateRequirementScreenState extends ConsumerState<CreateRequirementScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _budgetController = TextEditingController();
  final _locationController = TextEditingController();
  final _phoneController = TextEditingController();

  bool _isSubmitting = false;
  int _currentStep = 0;

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _budgetController.dispose();
    _locationController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _submitRequirement() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);

    try {
      // TODO: Call API to submit requirement
      await Future.delayed(const Duration(seconds: 2));

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Requirement posted successfully!')),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Post Requirement'),
        backgroundColor: AppColors.surface,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 20),
              _buildStepIndicator(),
              const SizedBox(height: 30),
              _buildCurrentStep(),
              const SizedBox(height: 30),
              if (_currentStep > 0)
                DelalaButton(
                  label: 'Back',
                  onPressed: () {
                    setState(() => _currentStep--);
                  },
                  variant: DelalaButtonVariant.outline,
                ),
              if (_currentStep < 4)
                DelalaButton(
                  label: 'Next',
                  onPressed: () {
                    if (_formKey.currentState!.validate()) {
                      setState(() => _currentStep++);
                    }
                  },
                  isLoading: _isSubmitting,
                )
              else
                DelalaButton(
                  label: 'Submit Requirement',
                  onPressed: _submitRequirement,
                  isLoading: _isSubmitting,
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStepIndicator() {
    return Row(
      children: List.generate(5, (index) {
        final isCompleted = index < _currentStep;
        final isCurrent = index == _currentStep;

        return Expanded(
          child: Padding(
            padding: EdgeInsets.only(right: index < 4 ? 8 : 0),
            child: Column(
              children: [
                Container(
                  height: 4,
                  decoration: BoxDecoration(
                    color: isCompleted
                        ? AppColors.primary
                        : isCurrent
                            ? AppColors.primary
                            : AppColors.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  ['Title', 'Description', 'Budget', 'Location', 'Contact'][index],
                  style: TextStyle(
                    fontSize: 12,
                    color: isCompleted || isCurrent ? AppColors.primary : AppColors.textMuted,
                    fontWeight: isCurrent ? FontWeight.w600 : FontWeight.w400,
                  ),
                ),
              ],
            ),
          ),
        );
      }),
    );
  }

  Widget _buildCurrentStep() {
    switch (_currentStep) {
      case 0:
        return _buildTitleStep();
      case 1:
        return _buildDescriptionStep();
      case 2:
        return _buildBudgetStep();
      case 3:
        return _buildLocationStep();
      case 4:
        return _buildContactStep();
      default:
        return const SizedBox();
    }
  }

  Widget _buildTitleStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Step 1/5: Requirement Title',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w600,
              ),
        ),
        const SizedBox(height: 12),
        Text(
          'Enter a descriptive title for your requirement',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: AppColors.textSecondary,
              ),
        ),
        const SizedBox(height: 20),
        TextFormField(
          controller: _titleController,
          decoration: AppDecorations.inputDecoration(
            label: 'Title',
            hint: 'e.g., Looking for 2-bedroom apartment in Bole',
          ),
          validator: (value) {
            if (value == null || value.length < 5) {
              return 'Title must be at least 5 characters';
            }
            return null;
          },
        ),
      ],
    );
  }

  Widget _buildDescriptionStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Step 2/5: Description',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w600,
              ),
        ),
        const SizedBox(height: 12),
        Text(
          'Describe what you\'re looking for in detail',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: AppColors.textSecondary,
              ),
        ),
        const SizedBox(height: 20),
        TextFormField(
          controller: _descriptionController,
          maxLines: 5,
          decoration: AppDecorations.inputDecoration(
            label: 'Description',
            hint: 'Include details about budget, preferred location, amenities, etc.',
          ),
          validator: (value) {
            if (value == null || value.length < 20) {
              return 'Description must be at least 20 characters';
            }
            return null;
          },
        ),
      ],
    );
  }

  Widget _buildBudgetStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Step 3/5: Budget',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w600,
              ),
        ),
        const SizedBox(height: 12),
        Text(
          'Enter your budget in ETB',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: AppColors.textSecondary,
              ),
        ),
        const SizedBox(height: 20),
        TextFormField(
          controller: _budgetController,
          keyboardType: TextInputType.number,
          decoration: AppDecorations.inputDecoration(
            label: 'Budget (ETB)',
            hint: 'e.g., 5000',
            prefixIcon: Icons.attach_money_rounded,
          ),
          validator: (value) {
            if (value == null || value.isEmpty) {
              return 'Please enter your budget';
            }
            final budget = int.tryParse(value);
            if (budget == null || budget < 100) {
              return 'Budget must be at least 100 ETB';
            }
            return null;
          },
        ),
      ],
    );
  }

  Widget _buildLocationStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Step 4/5: Preferred Location',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w600,
              ),
        ),
        const SizedBox(height: 12),
        Text(
          'Enter your preferred location',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: AppColors.textSecondary,
              ),
        ),
        const SizedBox(height: 20),
        TextFormField(
          controller: _locationController,
          decoration: AppDecorations.inputDecoration(
            label: 'Location',
            hint: 'e.g., Addis Ababa, Bole',
            prefixIcon: Icons.location_on_rounded,
          ),
          validator: (value) {
            if (value == null || value.length < 3) {
              return 'Location must be at least 3 characters';
            }
            return null;
          },
        ),
      ],
    );
  }

  Widget _buildContactStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Step 5/5: Contact Phone',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w600,
              ),
        ),
        const SizedBox(height: 12),
        Text(
          'Enter your contact phone number',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: AppColors.textSecondary,
              ),
        ),
        const SizedBox(height: 20),
        TextFormField(
          controller: _phoneController,
          keyboardType: TextInputType.phone,
          decoration: AppDecorations.inputDecoration(
            label: 'Phone Number',
            hint: 'e.g., +251911000000',
            prefixIcon: Icons.phone_rounded,
          ),
          validator: (value) {
            if (value == null || value.isEmpty) {
              return 'Please enter your phone number';
            }
            if (!isValidEthiopianPhone(value)) {
              return 'Please enter a valid phone number';
            }
            return null;
          },
        ),
      ],
    );
  }
}
