const authService = require('../../application/services/Auth.service');
const { getPagination, buildPaginationMeta } = require('../../shared/utils/pagination');

class AuthController {
  async register(req, res) {
    const result = await authService.register(req.body);
    res.status(201).json({ success: true, data: result });
  }

  async login(req, res) {
    const { identifier, password } = req.body;
    const result = await authService.login(identifier, password);
    res.json({ success: true, data: result });
  }

  async refresh(req, res) {
    const tokens = await authService.refresh(req.body.refreshToken);
    res.json({ success: true, data: tokens });
  }

  async logout(req, res) {
    await authService.logout(req.body.refreshToken);
    res.json({ success: true, data: { message: 'Logged out successfully' } });
  }

  async getMe(req, res) {
    const user = await authService.getProfile(req.user._id);
    res.json({ success: true, data: user });
  }

  async updateMe(req, res) {
    const user = await authService.updateProfile(req.user._id, req.body);
    res.json({ success: true, data: user });
  }

  async registerFcmToken(req, res) {
    await authService.registerFcmToken(req.user._id, req.body.fcmToken);
    res.json({ success: true, data: { message: 'FCM token registered' } });
  }

  async forgotPassword(req, res) {
    const result = await authService.forgotPassword(req.body.phoneNumber);
    res.json({ success: true, data: result });
  }

  async resetPassword(req, res) {
    const result = await authService.resetPassword(
      req.body.phoneNumber,
      req.body.otp,
      req.body.newPassword
    );
    res.json({ success: true, data: result });
  }

  async loginWithTelegram(req, res) {
    const result = await authService.loginWithTelegram(req.body);
    res.json({ success: true, data: result });
  }
}

module.exports = new AuthController();
