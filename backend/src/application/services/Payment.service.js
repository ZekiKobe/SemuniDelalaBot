const mongoose = require('mongoose');
const paymentRepository = require('../../infrastructure/database/repositories/Payment.repository');
const propertyRepository = require('../../infrastructure/database/repositories/Property.repository');
const settingsService = require('./Settings.service');
const notificationService = require('./Notification.service');
const telegramService = require('../../infrastructure/external/telegram/TelegramBot.service');
const auditService = require('./Audit.service');
const AppError = require('../../shared/errors/AppError');
const { PropertyStatus, PaymentStatus, NotificationType } = require('../../domain/enums');

class PaymentService {
  async create(userId, propertyId, method) {
    const property = await propertyRepository.findByIdRaw(propertyId);
    if (!property) throw new AppError('Property not found', 404, 'PROPERTY_NOT_FOUND');

    if (!property.createdBy.equals(userId)) {
      throw new AppError('Not authorized', 403, 'AUTH_FORBIDDEN');
    }

    if (property.status !== PropertyStatus.PENDING_PAYMENT) {
      throw new AppError('Property is not awaiting payment', 400, 'PROPERTY_INVALID_STATUS');
    }

    const existing = await paymentRepository.findActiveByProperty(propertyId);
    if (existing) {
      throw new AppError('Payment already exists for this property', 409, 'PAYMENT_ALREADY_EXISTS');
    }

    const instructions = await settingsService.getPaymentInstructions();
    const amount = instructions.listingFeeEtb;

    const payment = await paymentRepository.create({
      userId,
      propertyId,
      amount,
      method,
      paymentInstructions: {
        telebirr: instructions.telebirr,
        cbe: instructions.cbe,
      },
    });

    return { payment, instructions };
  }

  async getInstructions() {
    return settingsService.getPaymentInstructions();
  }

  async submit(paymentId, userId, transactionReference, screenshotUrl) {
    const payment = await paymentRepository.findByIdRaw(paymentId);
    if (!payment) throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');

    if (!payment.userId.equals(userId)) {
      throw new AppError('Not authorized', 403, 'AUTH_FORBIDDEN');
    }

    if (payment.status !== PaymentStatus.CREATED) {
      throw new AppError('Payment cannot be submitted', 400, 'PAYMENT_INVALID_STATUS');
    }

    const duplicate = await paymentRepository.findByTransactionRef(transactionReference);
    if (duplicate) {
      throw new AppError('Transaction reference already used', 409, 'PAYMENT_DUPLICATE_REF');
    }

    const updated = await paymentRepository.update(paymentId, {
      transactionReference,
      screenshotUrl,
      status: PaymentStatus.SUBMITTED,
      submittedAt: new Date(),
    });

    await propertyRepository.update(payment.propertyId, {
      status: PropertyStatus.PENDING_APPROVAL,
      paymentId: payment._id,
    });

    await telegramService.notifyAdmin(
      `💳 <b>New Payment Submission</b>\n` +
      `Amount: ${payment.amount} ETB\n` +
      `Method: ${payment.method}\n` +
      `Reference: ${transactionReference}\n` +
      `Property ID: ${payment.propertyId}`
    );

    return updated;
  }

  async getHistory(userId, skip, limit) {
    return paymentRepository.findByUser(userId, skip, limit);
  }

  async getById(paymentId, userId, isAdmin = false) {
    const payment = await paymentRepository.findById(paymentId);
    if (!payment) throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');

    if (!isAdmin && !payment.userId.equals(userId)) {
      throw new AppError('Not authorized', 403, 'AUTH_FORBIDDEN');
    }

    return payment;
  }

  async approve(paymentId, admin, req) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const payment = await paymentRepository.findByIdRaw(paymentId);
      if (!payment) throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');

      if (payment.status !== PaymentStatus.SUBMITTED) {
        throw new AppError('Payment cannot be approved', 400, 'PAYMENT_INVALID_STATUS');
      }

      const durationDays = await settingsService.getListingDurationDays();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

      await paymentRepository.update(paymentId, {
        status: PaymentStatus.APPROVED,
        verifiedBy: admin._id,
        verifiedAt: now,
      });

      const property = await propertyRepository.update(payment.propertyId, {
        status: PropertyStatus.APPROVED,
        approvedBy: admin._id,
        publishedAt: now,
        expiresAt,
      });

      await session.commitTransaction();

      await auditService.log({
        actor: admin,
        action: 'payment.approve',
        entityType: 'payment',
        entityId: paymentId,
        changes: { status: PaymentStatus.APPROVED },
        req,
      });

      await notificationService.createAndSend(payment.userId, {
        type: NotificationType.PAYMENT_APPROVED,
        title: 'Payment Approved',
        body: 'Your listing payment has been approved. Your property is now live!',
        data: { propertyId: payment.propertyId.toString(), paymentId: paymentId.toString() },
      });

      await notificationService.createAndSend(payment.userId, {
        type: NotificationType.LISTING_APPROVED,
        title: 'Listing Published',
        body: `Your property "${property.title}" is now published.`,
        data: { propertyId: payment.propertyId.toString(), action: 'view_listing' },
      });

      const fullProperty = await propertyRepository.findById(payment.propertyId);
      try {
        await telegramService.postListingToChannel(fullProperty);
      } catch {
        // Logged in telegram service — don't fail approval
      }

      return { payment, property: fullProperty };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async reject(paymentId, admin, rejectionReason, adminNotes, req) {
    const payment = await paymentRepository.findByIdRaw(paymentId);
    if (!payment) throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');

    if (payment.status !== PaymentStatus.SUBMITTED) {
      throw new AppError('Payment cannot be rejected', 400, 'PAYMENT_INVALID_STATUS');
    }

    const updated = await paymentRepository.update(paymentId, {
      status: PaymentStatus.REJECTED,
      rejectionReason,
      adminNotes,
      verifiedBy: admin._id,
      verifiedAt: new Date(),
    });

    await propertyRepository.update(payment.propertyId, {
      status: PropertyStatus.PENDING_PAYMENT,
      rejectionReason,
    });

    await auditService.log({
      actor: admin,
      action: 'payment.reject',
      entityType: 'payment',
      entityId: paymentId,
      changes: { status: PaymentStatus.REJECTED, rejectionReason },
      req,
    });

    await notificationService.createAndSend(payment.userId, {
      type: NotificationType.PAYMENT_REJECTED,
      title: 'Payment Rejected',
      body: rejectionReason,
      data: { propertyId: payment.propertyId.toString(), paymentId: paymentId.toString() },
    });

    return updated;
  }
}

module.exports = new PaymentService();
