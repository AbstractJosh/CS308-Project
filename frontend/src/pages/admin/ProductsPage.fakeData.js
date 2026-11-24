export const fakeCategories = [
  { id: 1, name: 'Espresso Machines', slug: 'espresso-machines' },
  { id: 2, name: 'Fully Automatic Machines', slug: 'automatic-machines' },
  { id: 3, name: 'Filter Coffee Machines', slug: 'filter-machines' },
  { id: 4, name: 'Turkish Coffee Machines', slug: 'turkish-coffee-machines' },
  { id: 5, name: 'French Press & Moka Pot', slug: 'french-press-moka' },
  { id: 6, name: 'Professional Machines', slug: 'professional-machines' },
  { id: 7, name: 'Coffee', slug: 'coffee' },
  { id: 8, name: 'Grinders', slug: 'grinders' },
  { id: 9, name: 'Coffee Serving', slug: 'coffee-serving' },
  { id: 10, name: 'Care & Accessories', slug: 'care-accessories' },
];

const SEED_DATE = '2026-11-05T00:00:00.000Z';

const SEED_ROWS = [
  {
    id: 3,
    serialNumber: 'CRM-EM-1003',
    name: 'Sage The Barista Express Impress',
    categoryId: 1,
    model: 'SES876 BSS',
    quantityInStock: 9,
    price: 99999,
    popularity: 188,
    imageCount: 8,
    warrantyStatus: '2 years manufacturer warranty',
    distributor: 'Sage official distributor',
    description: 'Espresso machine with a built-in grinder and assisted tamping.',
  },
  {
    id: 7,
    serialNumber: 'CRM-EM-1007',
    name: 'Sage The Oracle Dual Boiler',
    categoryId: 1,
    model: 'SES995',
    quantityInStock: 0,
    price: 459999,
    popularity: 9,
    imageCount: 8,
    warrantyStatus: '2 years manufacturer warranty',
    distributor: 'Sage official distributor',
    description: 'Dual boiler espresso machine with automatic grinding, dosing and tamping.',
  },
  {
    id: 9,
    serialNumber: 'CRM-AM-2001',
    name: 'Jura E6 Piano Black',
    categoryId: 2,
    model: 'E6 (EC)',
    quantityInStock: 7,
    price: 79999,
    popularity: 85,
    imageCount: 4,
    warrantyStatus: '2 years manufacturer warranty',
    distributor: 'Jura official distributor',
    description: 'Fully automatic bean-to-cup machine for espresso, coffee and milk drinks.',
  },
  {
    id: 24,
    serialNumber: 'CRM-TK-4001',
    name: 'Leggno Gourmet Pro Turkish Coffee Machine Black',
    categoryId: 4,
    model: 'Gourmet Pro',
    quantityInStock: 20,
    price: 5499,
    popularity: 120,
    imageCount: 3,
    warrantyStatus: '2 years manufacturer warranty',
    distributor: 'Leggno official distributor',
    description: 'Turkish coffee machine that brews in the traditional way, with foam.',
  },
  {
    id: 25,
    serialNumber: 'CRM-FP-5001',
    name: 'Bialetti Moka Express 1 Cup',
    categoryId: 5,
    model: 'Moka Express 1',
    quantityInStock: 30,
    price: 1799,
    popularity: 156,
    imageCount: 7,
    warrantyStatus: 'No warranty',
    distributor: 'Bialetti official distributor',
    description: 'Classic aluminium stovetop moka pot for one cup.',
  },
  {
    id: 34,
    serialNumber: 'CRM-CF-7004',
    name: 'Hola Sol Turkish Coffee 250 g',
    categoryId: 7,
    model: 'Turkish Coffee 250 g',
    quantityInStock: 80,
    price: 279,
    popularity: 210,
    imageCount: 3,
    warrantyStatus: 'No warranty (consumable)',
    distributor: 'Hola Sol official distributor',
    description: 'Finely ground Turkish coffee, 250 g.',
  },
  {
    id: 40,
    serialNumber: 'CRM-GR-8004',
    name: 'Zassenhaus Manaos Hand Grinder',
    categoryId: 8,
    model: 'Manaos',
    quantityInStock: 14,
    price: 4199,
    popularity: 77,
    imageCount: 4,
    warrantyStatus: 'No warranty',
    distributor: 'Zassenhaus official distributor',
    description: 'Manual coffee grinder with a hand crank.',
  },
  {
    id: 50,
    serialNumber: 'CRM-AC-9505',
    name: 'Sage The Force Gauge Tamper 58 mm',
    categoryId: 10,
    model: 'Force Gauge 58 mm',
    quantityInStock: 8,
    price: 15999,
    popularity: 26,
    imageCount: 5,
    warrantyStatus: 'No warranty',
    distributor: 'Sage official distributor',
    description: 'Tamper with a force gauge for even pressure, 58 mm.',
  },
];

function withCategory(product) {
  const category = fakeCategories.find((item) => item.id === Number(product.categoryId));
  return { ...product, inStock: product.quantityInStock > 0, category: category ? { ...category } : null };
}

export const fakeProducts = SEED_ROWS.map((row) =>
  withCategory({ ...row, cost: null, createdAt: SEED_DATE, updatedAt: SEED_DATE })
);

let products = [];

export function resetFakeProducts() {
  products = fakeProducts.map((product) => ({ ...product, category: { ...product.category } }));
}

resetFakeProducts();

function notFound() {
  return Object.assign(new Error('Product not found'), { status: 404 });
}

function checkSerialNumber(serialNumber, ownId) {
  const taken = products.some((product) => product.serialNumber === serialNumber && product.id !== ownId);
  if (taken) throw Object.assign(new Error('A product with this serial number already exists'), { status: 409 });
}

export const fakeAdminProductsApi = {
  list: async () => ({
    products: [...products].sort((a, b) => a.id - b.id),
  }),
  categories: async () => ({
    categories: fakeCategories.map((category) => ({ ...category })),
  }),
  create: async (body) => {
    checkSerialNumber(body.serialNumber, null);
    const now = new Date().toISOString();
    const highestId = products.reduce((highest, product) => Math.max(highest, product.id), 0);
    const product = withCategory({
      ...body,
      id: highestId + 1,
      imageCount: 1,
      popularity: 0,
      createdAt: now,
      updatedAt: now,
    });
    products.push(product);
    return { product };
  },
  update: async (id, body) => {
    const index = products.findIndex((item) => String(item.id) === String(id));
    if (index === -1) throw notFound();
    const current = products[index];
    checkSerialNumber(body.serialNumber, current.id);
    const product = withCategory({ ...current, ...body, id: current.id, updatedAt: new Date().toISOString() });
    products[index] = product;
    return { product };
  },
  remove: async (id) => {
    const index = products.findIndex((item) => String(item.id) === String(id));
    if (index === -1) throw notFound();
    products.splice(index, 1);
    return {};
  },
};
