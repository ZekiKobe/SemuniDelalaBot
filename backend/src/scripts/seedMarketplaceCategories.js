const { connectDatabase } = require('../config/database');
const categoryRepository = require('../infrastructure/database/repositories/Category.repository');
const logger = require('../shared/logger/winston.logger');

const categoryTree = [
  {
    name: 'Electronics',
    slug: 'electronics',
    icon: 'plug',
    children: [
      ['Phones', 'phones'],
      ['Laptops', 'laptops'],
      ['Tablets', 'tablets'],
      ['Accessories', 'accessories'],
    ],
  },
  {
    name: 'Vehicles',
    slug: 'vehicles',
    icon: 'car',
    children: [
      ['Cars', 'cars'],
      ['Motorcycles', 'motorcycles'],
      ['Trucks', 'trucks'],
    ],
  },
  {
    name: 'Properties',
    slug: 'properties',
    icon: 'home',
    children: [
      ['Houses', 'houses'],
      ['Apartments', 'apartments'],
      ['Land', 'land'],
      ['Commercial Buildings', 'commercial-buildings'],
    ],
  },
  {
    name: 'Home & Living',
    slug: 'home-living',
    icon: 'sofa',
    children: [
      ['Furniture', 'furniture'],
      ['Appliances', 'appliances'],
    ],
  },
  {
    name: 'Others',
    slug: 'others',
    icon: 'more-horizontal',
    children: [],
  },
];

async function seedMarketplaceCategories() {
  await connectDatabase();

  for (const [rootIndex, root] of categoryTree.entries()) {
    const parent = await categoryRepository.upsertBySlug(root.slug, {
      name: root.name,
      icon: root.icon,
      sortOrder: rootIndex,
      isActive: true,
    });

    for (const [childIndex, [name, slug]] of root.children.entries()) {
      await categoryRepository.upsertBySlug(slug, {
        name,
        parentId: parent._id,
        sortOrder: childIndex,
        isActive: true,
      });
    }
  }

  logger.info('Marketplace categories seeded');
  process.exit(0);
}

seedMarketplaceCategories().catch((error) => {
  logger.error('Failed to seed marketplace categories', { error: error.message });
  process.exit(1);
});
