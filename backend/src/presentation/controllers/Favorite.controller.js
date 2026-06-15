const favoriteService = require('../../application/services/Favorite.service');
const { buildPaginationMeta } = require('../../shared/utils/pagination');

class FavoriteController {
  async add(req, res) {
    const favorite = await favoriteService.add(req.user._id, req.body.propertyId);
    res.status(201).json({ success: true, data: favorite });
  }

  async remove(req, res) {
    const result = await favoriteService.remove(req.user._id, req.params.propertyId);
    res.json({ success: true, data: result });
  }

  async list(req, res) {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const { data, total } = await favoriteService.getUserFavorites(
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

  async check(req, res) {
    const isFavorited = await favoriteService.isFavorited(
      req.user._id,
      req.params.propertyId
    );
    res.json({ success: true, data: { isFavorited } });
  }
}

module.exports = new FavoriteController();
