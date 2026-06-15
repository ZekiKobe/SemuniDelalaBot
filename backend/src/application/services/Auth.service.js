const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../../config');
const AppError = require('../../shared/errors/AppError');
const authRepository = require('../../infrastructure/database/repositories/Auth.repository');
const { normalizeEthiopianPhone } = require('../../shared/utils/phoneValidator');
const { UserRole } = require('../../domain/enums');

class AuthService {
  generateTokens(userId, role) {
    const accessToken = jwt.sign(
      { sub: userId, role },
      config.jwt.accessSecret,
      { expiresIn: config.jwt.accessExpiry }
    );

    const refreshToken = jwt.sign(
      { sub: userId, type: 'refresh' },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiry }
    );

    return { accessToken, refreshToken };
  }

  async hashRefreshToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async register(data) {
    const phoneNumber = normalizeEthiopianPhone(data.phoneNumber);
    const existing = await authRepository.findByPhone(phoneNumber);
    if (existing) {
      throw new AppError('Phone number already registered', 409, 'USER_ALREADY_EXISTS');
    }

    if (data.email) {
      const emailExists = await authRepository.findByEmail(data.email);
      if (emailExists) {
        throw new AppError('Email already registered', 409, 'USER_ALREADY_EXISTS');
      }
    }

    const user = await authRepository.createUser({
      fullName: data.fullName,
      phoneNumber,
      email: data.email || undefined,
      password: data.password,
      role: UserRole.USER,
      preferredLanguage: data.preferredLanguage,
    });

    const tokens = this.generateTokens(user._id, user.role);
    const tokenHash = await this.hashRefreshToken(tokens.refreshToken);

    await authRepository.saveRefreshToken({
      userId: user._id,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return { user, ...tokens };
  }

  async login(identifier, password) {
    const isEmail = identifier.includes('@');
    let user;

    if (isEmail) {
      user = await authRepository.findByEmailWithPassword(identifier);
    } else {
      const phone = normalizeEthiopianPhone(identifier);
      if (!phone) {
        throw new AppError('Invalid credentials', 401, 'AUTH_INVALID_CREDENTIALS');
      }
      user = await authRepository.findByPhoneWithPassword(phone);
    }

    if (!user) {
      throw new AppError('Invalid credentials', 401, 'AUTH_INVALID_CREDENTIALS');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Invalid credentials', 401, 'AUTH_INVALID_CREDENTIALS');
    }

    await authRepository.updateUser(user._id, { lastLoginAt: new Date() });

    const tokens = this.generateTokens(user._id, user.role);
    const tokenHash = await this.hashRefreshToken(tokens.refreshToken);

    await authRepository.saveRefreshToken({
      userId: user._id,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    user.password = undefined;
    return { user, ...tokens };
  }

  async refresh(refreshToken) {
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
    } catch {
      throw new AppError('Invalid refresh token', 401, 'AUTH_TOKEN_INVALID');
    }

    const tokenHash = await this.hashRefreshToken(refreshToken);
    const stored = await authRepository.findRefreshToken(tokenHash);

    if (!stored || stored.expiresAt < new Date()) {
      throw new AppError('Invalid refresh token', 401, 'AUTH_TOKEN_INVALID');
    }

    const user = await authRepository.findById(decoded.sub);
    if (!user) {
      throw new AppError('User not found', 401, 'AUTH_UNAUTHORIZED');
    }

    await authRepository.deleteRefreshToken(tokenHash);

    const tokens = this.generateTokens(user._id, user.role);
    const newHash = await this.hashRefreshToken(tokens.refreshToken);

    await authRepository.saveRefreshToken({
      userId: user._id,
      tokenHash: newHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return tokens;
  }

  async logout(refreshToken) {
    if (refreshToken) {
      const tokenHash = await this.hashRefreshToken(refreshToken);
      await authRepository.deleteRefreshToken(tokenHash);
    }
  }

  async getProfile(userId) {
    const user = await authRepository.findById(userId);
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    return user;
  }

  async updateProfile(userId, data) {
    if (data.email) {
      const existing = await authRepository.findByEmail(data.email);
      if (existing && existing._id.toString() !== userId) {
        throw new AppError('Email already in use', 409, 'USER_ALREADY_EXISTS');
      }
    }
    return authRepository.updateUser(userId, data);
  }

  async registerFcmToken(userId, fcmToken) {
    return authRepository.addFcmToken(userId, fcmToken);
  }

  async forgotPassword(phoneNumber) {
    const phone = normalizeEthiopianPhone(phoneNumber);
    const user = await authRepository.findByPhone(phone);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    await authRepository.updateUser(user._id, {
      passwordResetOtp: {
        code: hashedOtp,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        attempts: 0,
      },
    });

    // OTP-ready: integrate SMS gateway here
    return { message: 'OTP sent successfully', ...(config.env === 'development' && { otp }) };
  }

  async resetPassword(phoneNumber, otp, newPassword) {
    const phone = normalizeEthiopianPhone(phoneNumber);
    const user = await authRepository.findByIdWithPassword(
      (await authRepository.findByPhone(phone))?._id
    );

    if (!user?.passwordResetOtp?.code) {
      throw new AppError('Invalid or expired OTP', 400, 'VALIDATION_ERROR');
    }

    if (user.passwordResetOtp.expiresAt < new Date()) {
      throw new AppError('OTP expired', 400, 'VALIDATION_ERROR');
    }

    if (user.passwordResetOtp.attempts >= 3) {
      throw new AppError('Too many attempts', 429, 'RATE_LIMIT_EXCEEDED');
    }

    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    if (hashedOtp !== user.passwordResetOtp.code) {
      await authRepository.updateUser(user._id, {
        'passwordResetOtp.attempts': user.passwordResetOtp.attempts + 1,
      });
      throw new AppError('Invalid OTP', 400, 'VALIDATION_ERROR');
    }

    user.password = newPassword;
    user.passwordResetOtp = undefined;
    await user.save();
    await authRepository.deleteAllRefreshTokens(user._id);

    return { message: 'Password reset successfully' };
  }
}

module.exports = new AuthService();
