const path = require('path');
const config = require('../../config');
const paymentService = require('../../application/services/Payment.service');
const { buildPaginationMeta } = require('../../shared/utils/pagination');

class PaymentController {
  async create(req, res) {
    const result = await paymentService.create(
      req.user._id,
      req.body.propertyId,
      req.body.method
    );
    res.status(201).json({ success: true, data: result });
  }

  async getInstructions(req, res) {
    const instructions = await paymentService.getInstructions();
    res.json({ success: true, data: instructions });
  }

  async submit(req, res) {
    let screenshotUrl;
    if (req.file) {
      screenshotUrl = `/uploads/temp/${req.file.filename}`;
    }

    const payment = await paymentService.submit(
      req.params.id,
      req.user._id,
      req.body.transactionReference,
      screenshotUrl
    );
    res.json({ success: true, data: payment });
  }

  async getHistory(req, res) {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const { data, total } = await paymentService.getHistory(
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

  async getById(req, res) {
    const payment = await paymentService.getById(req.params.id, req.user._id);
    res.json({ success: true, data: payment });
  }
}

module.exports = new PaymentController();
