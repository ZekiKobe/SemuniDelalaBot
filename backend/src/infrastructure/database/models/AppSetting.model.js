const mongoose = require('mongoose');
const { SettingCategory } = require('../../../domain/enums');

const appSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    category: {
      type: String,
      enum: Object.values(SettingCategory),
      default: SettingCategory.GENERAL,
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

module.exports = mongoose.model('AppSetting', appSettingSchema);
