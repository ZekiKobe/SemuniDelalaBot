const propertyService = require('../../application/services/Property.service');
const { buildPaginationMeta } = require('../../shared/utils/pagination');

class PropertyController {
  async list(req, res) {
    const { data, total } = await propertyService.search(req.query);
    const { page, limit } = req.query;
    res.json({
      success: true,
      data,
      meta: buildPaginationMeta(Number(page) || 1, Number(limit) || 20, total),
    });
  }

  async getFeatured(req, res) {
    const data = await propertyService.getFeatured();
    res.json({ success: true, data });
  }

  async getNew(req, res) {
    const data = await propertyService.getNew();
    res.json({ success: true, data });
  }

  async getPopular(req, res) {
    const data = await propertyService.getPopular();
    res.json({ success: true, data });
  }

  async getAreas(req, res) {
    const data = await propertyService.getPopularAreas();
    res.json({ success: true, data });
  }

  async getById(req, res) {
    const property = await propertyService.getById(req.params.id);
    res.json({ success: true, data: property });
  }

  async getRelated(req, res) {
    const data = await propertyService.getRelated(req.params.id);
    res.json({ success: true, data });
  }

  async create(req, res) {
    const property = await propertyService.create(req.user._id, req.body);
    res.status(201).json({ success: true, data: property });
  }

  async update(req, res) {
    const property = await propertyService.update(req.params.id, req.user._id, req.body);
    res.json({ success: true, data: property });
  }

  async delete(req, res) {
    await propertyService.delete(req.params.id, req.user._id);
    res.json({ success: true, data: { message: 'Property deleted' } });
  }

  async uploadImages(req, res) {
    const property = await propertyService.uploadImages(
      req.params.id,
      req.user._id,
      req.files
    );
    res.json({ success: true, data: property });
  }

  async removeImage(req, res) {
    const property = await propertyService.removeImage(
      req.params.id,
      req.params.imageId,
      req.user._id
    );
    res.json({ success: true, data: property });
  }

  async submit(req, res) {
    const property = await propertyService.submitForPayment(req.params.id, req.user._id);
    res.json({ success: true, data: property });
  }

  async myListings(req, res) {
    const { page = 1, limit = 20, status } = req.query;
    const { data, total } = await propertyService.getMyListings(
      req.user._id,
      status,
      Number(page),
      Number(limit)
    );
    res.json({
      success: true,
      data,
      meta: buildPaginationMeta(Number(page), Number(limit), total),
    });
  }
}

module.exports = new PropertyController();
