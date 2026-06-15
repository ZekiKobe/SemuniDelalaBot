const mongoose = require('mongoose');
const { ReportReason, ReportStatus, AdminAction } = require('../../../domain/enums');

const reportSchema = new mongoose.Schema(
  {
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: {
      type: String,
      enum: Object.values(ReportReason),
      required: true,
    },
    description: { type: String, maxlength: 1000 },
    status: {
      type: String,
      enum: Object.values(ReportStatus),
      default: ReportStatus.PENDING,
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    adminAction: {
      type: String,
      enum: Object.values(AdminAction),
      default: AdminAction.NONE,
    },
    adminNotes: { type: String },
  },
  { timestamps: true }
);

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ propertyId: 1 });
reportSchema.index({ reportedBy: 1, propertyId: 1 });

module.exports = mongoose.model('Report', reportSchema);
