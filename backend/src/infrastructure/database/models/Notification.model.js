const mongoose = require('mongoose');
const { NotificationType } = require('../../../domain/enums');

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    data: {
      propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
      paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
      action: { type: String },
    },
    isRead: { type: Boolean, default: false },
    sentViaFcm: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('Notification', notificationSchema);
