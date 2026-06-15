const categoryRepository = require('../../infrastructure/database/repositories/Category.repository');
const AppError = require('../../shared/errors/AppError');
const { generateSlug } = require('../../shared/utils/slugGenerator');

class CategoryService {
  async listTree() {
    const categories = await categoryRepository.findActive();
    const byId = new Map(categories.map((category) => [
      category._id.toString(),
      { ...category, children: [] },
    ]));
    const roots = [];

    byId.forEach((category) => {
      if (category.parentId && byId.has(category.parentId.toString())) {
        byId.get(category.parentId.toString()).children.push(category);
      } else {
        roots.push(category);
      }
    });

    return roots;
  }

  async listRoots() {
    return categoryRepository.findActiveRoots();
  }

  async listChildren(parentId) {
    await this.assertActive(parentId);
    return categoryRepository.findActiveChildren(parentId);
  }

  async create(data) {
    if (data.parentId) {
      const parent = await categoryRepository.findById(data.parentId);
      if (!parent) throw new AppError('Parent category not found', 404, 'CATEGORY_NOT_FOUND');
      if (!parent.isActive) throw new AppError('Parent category is inactive', 400, 'CATEGORY_INACTIVE');
    }

    const slug = data.slug || generateSlug(data.name);
    return categoryRepository.create({ ...data, slug });
  }

  async update(id, data) {
    const category = await categoryRepository.findById(id);
    if (!category) throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');

    if (data.parentId) {
      if (data.parentId.toString() === id.toString()) {
        throw new AppError('Category cannot be its own parent', 400, 'CATEGORY_INVALID_PARENT');
      }
      const parent = await categoryRepository.findById(data.parentId);
      if (!parent) throw new AppError('Parent category not found', 404, 'CATEGORY_NOT_FOUND');
      if (!parent.isActive) throw new AppError('Parent category is inactive', 400, 'CATEGORY_INACTIVE');
      await this.assertNoCircularParent(id, parent);
    }

    if (data.name && !data.slug) data.slug = generateSlug(data.name, id);
    return categoryRepository.update(id, data);
  }

  async assertActive(id) {
    const category = await categoryRepository.findById(id);
    if (!category || !category.isActive) {
      throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
    }
    return category;
  }

  async assertChildOfParent(parentId, childId) {
    const parent = await this.assertActive(parentId);
    const child = await this.assertActive(childId);

    if (!child.parentId || child.parentId.toString() !== parent._id.toString()) {
      throw new AppError('Subcategory does not belong to category', 400, 'CATEGORY_PARENT_MISMATCH');
    }

    return { parent, child };
  }

  async assertNoCircularParent(categoryId, parent) {
    let current = parent;

    while (current?.parentId) {
      if (current.parentId.toString() === categoryId.toString()) {
        throw new AppError('Category parent would create a cycle', 400, 'CATEGORY_INVALID_PARENT');
      }
      current = await categoryRepository.findById(current.parentId);
    }
  }
}

module.exports = new CategoryService();
