const categoryService = require('../../application/services/Category.service');

class CategoryController {
  async list(_req, res) {
    const data = await categoryService.listTree();
    res.json({ success: true, data });
  }

  async roots(_req, res) {
    const data = await categoryService.listRoots();
    res.json({ success: true, data });
  }

  async children(req, res) {
    const data = await categoryService.listChildren(req.params.id);
    res.json({ success: true, data });
  }

  async create(req, res) {
    const category = await categoryService.create(req.body);
    res.status(201).json({ success: true, data: category });
  }

  async update(req, res) {
    const category = await categoryService.update(req.params.id, req.body);
    res.json({ success: true, data: category });
  }
}

module.exports = new CategoryController();
