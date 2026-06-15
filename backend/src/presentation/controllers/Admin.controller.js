const adminService = require('../../application/services/Admin.service');
const paymentService = require('../../application/services/Payment.service');
const reportService = require('../../application/services/Report.service');
const { buildPaginationMeta } = require('../../shared/utils/pagination');

class AdminController {
  async dashboard(req, res) {
    const data = await adminService.getDashboard();
    res.json({ success: true, data });
  }

  async getUsers(req, res) {
    const { data, total } = await adminService.getUsers(req.query);
    const { page = 1, limit = 20 } = req.query;
    res.json({
      success: true,
      data,
      meta: buildPaginationMeta(Number(page), Number(limit), total),
    });
  }

  async getUserById(req, res) {
    const user = await adminService.getUserById(req.params.id);
    res.json({ success: true, data: user });
  }

  async updateUserStatus(req, res) {
    const user = await adminService.updateUserStatus(
      req.params.id,
      req.body.status,
      req.user,
      req
    );
    res.json({ success: true, data: user });
  }

  async updateUserRole(req, res) {
    const user = await adminService.updateUserRole(
      req.params.id,
      req.body.role,
      req.user,
      req
    );
    res.json({ success: true, data: user });
  }

  async getProperties(req, res) {
    const { data, total } = await adminService.getProperties(req.query);
    const { page = 1, limit = 20 } = req.query;
    res.json({
      success: true,
      data,
      meta: buildPaginationMeta(Number(page), Number(limit), total),
    });
  }

  async approveProperty(req, res) {
    const property = await adminService.approveProperty(req.params.id, req.user, req);
    res.json({ success: true, data: property });
  }

  async rejectProperty(req, res) {
    const property = await adminService.rejectProperty(
      req.params.id,
      req.user,
      req.body.rejectionReason,
      req
    );
    res.json({ success: true, data: property });
  }

  async suspendProperty(req, res) {
    const property = await adminService.suspendProperty(req.params.id, req.user, req);
    res.json({ success: true, data: property });
  }

  async getPayments(req, res) {
    const { data, total } = await adminService.getPayments(req.query);
    const { page = 1, limit = 20 } = req.query;
    res.json({
      success: true,
      data,
      meta: buildPaginationMeta(Number(page), Number(limit), total),
    });
  }

  async approvePayment(req, res) {
    const result = await paymentService.approve(req.params.id, req.user, req);
    res.json({ success: true, data: result });
  }

  async rejectPayment(req, res) {
    const payment = await paymentService.reject(
      req.params.id,
      req.user,
      req.body.rejectionReason,
      req.body.adminNotes,
      req
    );
    res.json({ success: true, data: payment });
  }

  async getReports(req, res) {
    const { data, total } = await adminService.getReports(req.query);
    const { page = 1, limit = 20 } = req.query;
    res.json({
      success: true,
      data,
      meta: buildPaginationMeta(Number(page), Number(limit), total),
    });
  }

  async resolveReport(req, res) {
    const report = await reportService.resolve(req.params.id, req.user, req.body, req);
    res.json({ success: true, data: report });
  }

  async getSettings(req, res) {
    const settings = await adminService.getSettings();
    res.json({ success: true, data: settings });
  }

  async updateSettings(req, res) {
    const settings = await adminService.updateSettings(req.body.settings, req.user);
    res.json({ success: true, data: settings });
  }

  async getAuditLogs(req, res) {
    const { data, total } = await adminService.getAuditLogs(req.query);
    const { page = 1, limit = 50 } = req.query;
    res.json({
      success: true,
      data,
      meta: buildPaginationMeta(Number(page), Number(limit), total),
    });
  }

  async getTelegramPosts(req, res) {
    const { data, total } = await adminService.getTelegramPosts(req.query);
    const { page = 1, limit = 20 } = req.query;
    res.json({
      success: true,
      data,
      meta: buildPaginationMeta(Number(page), Number(limit), total),
    });
  }

  async getRequirements(req, res) {
    const { data, total } = await adminService.getRequirements(req.query);
    const { page = 1, limit = 20 } = req.query;
    res.json({ success: true, data, meta: buildPaginationMeta(Number(page), Number(limit), total) });
  }

  async getMarketplaceListings(req, res) {
    const { data, total } = await adminService.getMarketplaceListings(req.query);
    const { page = 1, limit = 20 } = req.query;
    res.json({ success: true, data, meta: buildPaginationMeta(Number(page), Number(limit), total) });
  }

  async approveMarketplaceListing(req, res) {
    const listing = await adminService.approveMarketplaceListing(req.params.id, req.user, req);
    res.json({ success: true, data: listing });
  }

  async rejectMarketplaceListing(req, res) {
    const listing = await adminService.rejectMarketplaceListing(
      req.params.id,
      req.user,
      req.body.rejectionReason,
      req
    );
    res.json({ success: true, data: listing });
  }

  async approveRequirement(req, res) {
    const requirement = await adminService.approveRequirement(req.params.id, req.user, req);
    res.json({ success: true, data: requirement });
  }

  async rejectRequirement(req, res) {
    const requirement = await adminService.rejectRequirement(req.params.id, req.user, req.body.rejectionReason, req);
    res.json({ success: true, data: requirement });
  }
}

module.exports = new AdminController();
