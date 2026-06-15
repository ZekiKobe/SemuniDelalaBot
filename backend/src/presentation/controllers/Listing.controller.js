const listingService = require('../../application/services/Listing.service');
const { buildPaginationMeta } = require('../../shared/utils/pagination');

class ListingController {
  async list(req, res) {
    const { data, total } = await listingService.search(req.query);
    const { page, limit } = req.query;
    res.json({
      success: true,
      data,
      meta: buildPaginationMeta(Number(page) || 1, Number(limit) || 20, total),
    });
  }

  async getById(req, res) {
    const listing = await listingService.getById(req.params.id, {
      userId: req.user?._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.json({ success: true, data: listing });
  }

  async create(req, res) {
    const listing = await listingService.create(req.user._id, req.body);
    res.status(201).json({ success: true, data: listing });
  }

  async update(req, res) {
    const listing = await listingService.update(req.params.id, req.user._id, req.body);
    res.json({ success: true, data: listing });
  }

  async delete(req, res) {
    await listingService.delete(req.params.id, req.user._id);
    res.json({ success: true, data: { message: 'Listing deleted' } });
  }

  async submit(req, res) {
    const listing = await listingService.submit(req.params.id, req.user._id);
    res.json({ success: true, data: listing });
  }

  async myListings(req, res) {
    const { data, total } = await listingService.getMyListings(req.user._id, req.query);
    const { page, limit } = req.query;
    res.json({
      success: true,
      data,
      meta: buildPaginationMeta(Number(page) || 1, Number(limit) || 20, total),
    });
  }

  async addFavorite(req, res) {
    const favorite = await listingService.addFavorite(req.user._id, req.params.id);
    res.status(201).json({ success: true, data: favorite });
  }

  async removeFavorite(req, res) {
    await listingService.removeFavorite(req.user._id, req.params.id);
    res.json({ success: true, data: { message: 'Listing removed from saved listings' } });
  }

  async favorites(req, res) {
    const { page = 1, limit = 20 } = req.query;
    const { data, total } = await listingService.getFavorites(req.user._id, page, limit);
    res.json({
      success: true,
      data,
      meta: buildPaginationMeta(Number(page), Number(limit), total),
    });
  }
}

module.exports = new ListingController();
