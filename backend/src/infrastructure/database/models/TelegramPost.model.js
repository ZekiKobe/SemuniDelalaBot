const mongoose = require('mongoose');
const { TelegramPostStatus, TelegramPostType } = require('../../../domain/enums');

const telegramPostSchema = new mongoose.Schema(
  {
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
    requirementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Requirement' },
    channelId: { type: String, required: true },
    messageId: { type: Number },
    postType: {
      type: String,
      enum: Object.values(TelegramPostType),
      default: TelegramPostType.LISTING,
    },
    status: {
      type: String,
      enum: Object.values(TelegramPostStatus),
      default: TelegramPostStatus.SENT,
    },
    content: { type: String },
    imageMessageIds: [{ type: Number }],
    error: { type: String },
    postedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

telegramPostSchema.index({ propertyId: 1 });
telegramPostSchema.index({ requirementId: 1 });
telegramPostSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('TelegramPost', telegramPostSchema);
