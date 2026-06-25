const unifiedListingService = require('../../application/services/UnifiedListing.service');

class UnifiedListingController {
  async getForRent(req, res) {
    try {
      const { limit = 20, sort = 'newest' } = req.query;
      const data = await unifiedListingService.getForRent(Number(limit), sort);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getForSale(req, res) {
    try {
      const { limit = 20, sort = 'newest' } = req.query;
      const data = await unifiedListingService.getForSale(Number(limit), sort);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getMarketplace(req, res) {
    try {
      const { limit = 20, sort = 'newest' } = req.query;
      const data = await unifiedListingService.getMarketplace(Number(limit), sort);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getFeatured(req, res) {
    try {
      const { limit = 10 } = req.query;
      const data = await unifiedListingService.getFeatured(Number(limit));
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new UnifiedListingController();
