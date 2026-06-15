const reportService = require('../../application/services/Report.service');
const { buildPaginationMeta } = require('../../shared/utils/pagination');

class ReportController {
  async create(req, res) {
    const report = await reportService.create(req.user._id, req.body);
    res.status(201).json({ success: true, data: report });
  }

  async myReports(req, res) {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const { data, total } = await reportService.getMyReports(
      req.user._id,
      skip,
      Number(limit)
    );
    res.json({
      success: true,
      data,
      meta: buildPaginationMeta(Number(page), Number(limit), total),
    });
  }
}

module.exports = new ReportController();
