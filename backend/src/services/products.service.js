// SCRUM-13 (Luis): catalog rules and queries for products (handbook 7.1, 8.2).
import db from '../db/knex.js';
import { notFound } from '../utils/httpError.js';
import { PRODUCT_COLUMNS, applyProductFilters, toProduct } from '../utils/productQuery.js';

// Every product query starts here: products joined with their category.
function productsWithCategory() {
  return db('products as p').join('categories as c', 'c.id', 'p.category_id').select(PRODUCT_COLUMNS);
}

// GET /products. filters = { category?: slug }. Only active products are listed;
// out-of-stock products are still listed, with inStock: false (handbook 7.1).
// An unknown category slug simply gives an empty list.
export async function listProducts(filters = {}) {
  const rows = await applyProductFilters(productsWithCategory(), filters);
  return rows.map(toProduct);
}

// GET /products/:id. A missing or inactive (removed) product is a 404.
export async function getProductById(id) {
  const row = await productsWithCategory().where('p.id', id).andWhere('p.is_active', true).first();
  if (!row) throw notFound('Product not found');
  return toProduct(row);
}
