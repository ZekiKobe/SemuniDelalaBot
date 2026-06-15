const mongoose = require('mongoose');
const { PaymentStatus, PaymentMethod } = require('../../../domain/enums');

const paymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'ETB' },
    method: {
      type: String,
      enum: Object.values(PaymentMethod),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.CREATED,
    },
    transactionReference: { type: String, trim: true },
    screenshotUrl: { type: String },
    submittedAt: { type: Date },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
    rejectionReason: { type: String },
    adminNotes: { type: String },
    paymentInstructions: {
      telebirr: {
        accountNumber: String,
        accountName: String,
      },
      cbe: {
        accountNumber: String,
        accountName: String,
      },
    },
  },
  { timestamps: true }
);

paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ propertyId: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ verifiedAt: 1 });
paymentSchema.index({ transactionReference: 1 }, { sparse: true });

module.exports = mongoose.model('Payment', paymentSchema);
