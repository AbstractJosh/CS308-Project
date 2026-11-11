// SCRUM-13 (Luis): small pure helpers for the catalog queries (handbook 5.3, 7.1, 8.1).
// Nothing here runs a query, so every function can be unit tested without a database.
// Sprint 2: Sidar adds search (q) and sort to applyProductFilters.

// Columns every product query selects. Products are read as "p" and joined with
// their category as "c". cost and is_active are never selected (handbook 8.1).
export const PRODUCT_COLUMNS = [
  'p.id',
  'p.name',
  'p.model',
  'p.serial_number',
  'p.description',
  'p.quantity_in_stock',
  'p.price',
  'p.warranty_status',
  'p.distributor',
  'p.image_count',
  'p.popularity',
  'p.category_id',
  'p.created_at',
  'p.updated_at',
  'c.name as category_name',
  'c.slug as category_slug',
];

// Adds the list filters to a knex query on "products as p" joined with "categories as c".
// filters = req.validatedQuery, for example { category: 'coffee' }.
export function applyProductFilters(query, filters = {}) {
  query.where('p.is_active', true);
  if (filters.category) query.where('c.slug', filters.category);
  if (filters.q) {
    const pattern = `%${escapeLike(filters.q)}%`;
    query.where((search) => search.whereILike('p.name', pattern).orWhereILike('p.description', pattern));
  }
  const sortOrder = SORT_ORDERS[filters.sort];
  if (sortOrder) query.orderBy(sortOrder.column, sortOrder.direction);
  // Default order is by id (handbook 7.1).
  query.orderBy('p.id', 'asc');
  return query;
}

export const SORT_ORDERS = {
  price_asc: { column: 'p.price', direction: 'asc' },
  price_desc: { column: 'p.price', direction: 'desc' },
  popularity: { column: 'p.popularity', direction: 'desc' },
  newest: { column: 'p.created_at', direction: 'desc' },
};

export function escapeLike(term) {
  return term.replace(/[\\%_]/g, (char) => `\\${char}`);
}

// Turns one database row (keys already camelCase from db/knex.js) into the
// Product JSON object of handbook 8.1.
export function toProduct(row) {
  const quantityInStock = Number(row.quantityInStock);
  return {
    id: row.id,
    name: row.name,
    model: row.model,
    serialNumber: row.serialNumber,
    description: row.description,
    quantityInStock,
    price: Number(row.price), // pg returns DECIMAL as a string
    warrantyStatus: row.warrantyStatus,
    distributor: row.distributor,
    imageCount: row.imageCount,
    popularity: row.popularity,
    categoryId: row.categoryId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    inStock: quantityInStock > 0,
    category: { id: row.categoryId, name: row.categoryName, slug: row.categorySlug },
  };
}

// Turns one categories row with its product count into the Category JSON object.
export function toCategory(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? null,
    productCount: Number(row.productCount), // COUNT() comes back as a string in pg
  };
}
