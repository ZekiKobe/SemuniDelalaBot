const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { UserRole, UserStatus, PreferredLanguage } = require('../../../domain/enums');

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.USER,
    },
    profileImage: { type: String },
    fcmTokens: [{ type: String }],
    telegramUsername: { type: String, trim: true, sparse: true },
    telegramChatId: { type: String, trim: true },
    isVerified: { type: Boolean, default: false },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.ACTIVE,
    },
    preferredLanguage: {
      type: String,
      enum: Object.values(PreferredLanguage),
      default: PreferredLanguage.EN,
    },
    listingsCount: { type: Number, default: 0 },
    lastLoginAt: { type: Date },
    passwordResetOtp: {
      code: { type: String, select: false },
      expiresAt: { type: Date, select: false },
      attempts: { type: Number, default: 0, select: false },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.password;
        delete ret.passwordResetOtp;
        delete ret.__v;
        return ret;
      },
    },
  }
);

userSchema.index({ role: 1, status: 1 });
userSchema.index({ createdAt: -1 });

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
