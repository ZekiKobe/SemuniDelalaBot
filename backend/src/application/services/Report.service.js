const reportRepository = require('../../infrastructure/database/repositories/Report.repository');
const propertyRepository = require('../../infrastructure/database/repositories/Property.repository');
const telegramService = require('../../infrastructure/external/telegram/TelegramBot.service');
const auditService = require('./Audit.service');
const AppError = require('../../shared/errors/AppError');
const { PropertyStatus, ReportStatus } = require('../../domain/enums');

class ReportService {
  async create(userId, data) {
    const property = await propertyRepository.findByIdRaw(data.propertyId);
    if (!property || property.status !== PropertyStatus.APPROVED) {
      throw new AppError('Property not found', 404, 'PROPERTY_NOT_FOUND');
    }

    const existing = await reportRepository.findByUserAndProperty(userId, data.propertyId);
    if (existing) {
      throw new AppError('You already reported this listing', 409, 'REPORT_ALREADY_EXISTS');
    }

    const report = await reportRepository.create({
      ...data,
      reportedBy: userId,
    });

    await telegramService.notifyAdmin(
      `⚠️ <b>New Report</b>\n` +
      `Reason: ${data.reason}\n` +
      `Property: ${property.title}\n` +
      `Report ID: ${report._id}`
    );

    return report;
  }

  async getMyReports(userId, skip, limit) {
    return reportRepository.findByUser(userId, skip, limit);
  }

  async resolve(reportId, admin, data, req) {
    const report = await reportRepository.findById(reportId);
    if (!report) throw new AppError('Report not found', 404, 'VALIDATION_ERROR');

    const updated = await reportRepository.update(reportId, {
      status: data.status === 'resolved' ? ReportStatus.RESOLVED : ReportStatus.DISMISSED,
      adminAction: data.adminAction,
      adminNotes: data.adminNotes,
      reviewedBy: admin._id,
      reviewedAt: new Date(),
    });

    if (data.adminAction === 'suspended') {
      await propertyRepository.update(report.propertyId, { status: PropertyStatus.SUSPENDED });
    } else if (data.adminAction === 'deleted') {
      await propertyRepository.update(report.propertyId, { status: PropertyStatus.SUSPENDED });
    }

    await auditService.log({
      actor: admin,
      action: 'report.resolve',
      entityType: 'report',
      entityId: reportId,
      changes: data,
      req,
    });

    return updated;
  }
}

module.exports = new ReportService();
