const User = require('../models/User.model');
const RefreshToken = require('../models/RefreshToken.model');

class AuthRepository {
  async createUser(data) {
    return User.create(data);
  }

  async findByPhone(phoneNumber) {
    return User.findOne({ phoneNumber });
  }

  async findByEmail(email) {
    return User.findOne({ email: email?.toLowerCase() });
  }

  async findByTelegramChatId(telegramChatId) {
    return User.findOne({ telegramChatId: String(telegramChatId) });
  }

  async findByTelegramId(telegramId) {
    return User.findOne({ telegramId: String(telegramId) });
  }

  async findById(id) {
    return User.findById(id);
  }

  async findByIdWithPassword(id) {
    return User.findById(id).select('+password');
  }

  async findByPhoneWithPassword(phoneNumber) {
    return User.findOne({ phoneNumber }).select('+password');
  }

  async findByEmailWithPassword(email) {
    return User.findOne({ email: email?.toLowerCase() }).select('+password');
  }

  async updateUser(id, data) {
    return User.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async saveRefreshToken(data) {
    return RefreshToken.create(data);
  }

  async findRefreshToken(tokenHash) {
    return RefreshToken.findOne({ tokenHash });
  }

  async deleteRefreshToken(tokenHash) {
    return RefreshToken.deleteOne({ tokenHash });
  }

  async deleteAllRefreshTokens(userId) {
    return RefreshToken.deleteMany({ userId });
  }

  async addFcmToken(userId, token) {
    return User.findByIdAndUpdate(
      userId,
      { $addToSet: { fcmTokens: token } },
      { new: true }
    );
  }

  async removeFcmToken(userId, token) {
    return User.findByIdAndUpdate(
      userId,
      { $pull: { fcmTokens: token } },
      { new: true }
    );
  }
}

module.exports = new AuthRepository();
