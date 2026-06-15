const Category = require('../models/Category.model');

class CategoryRepository {
  create(data) {
    return Category.create(data);
  }

  findActive(filter = {}) {
    return Category.find({ ...filter, isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean();
  }

  findActiveRoots() {
    return this.findActive({ parentId: null });
  }

  findActiveChildren(parentId) {
    return this.findActive({ parentId });
  }

  findById(id) {
    return Category.findById(id);
  }

  findBySlug(slug) {
    return Category.findOne({ slug });
  }

  update(id, data) {
    return Category.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  upsertBySlug(slug, data) {
    return Category.findOneAndUpdate(
      { slug },
      { ...data, slug },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
  }
}

module.exports = new CategoryRepository();
