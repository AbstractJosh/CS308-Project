// Sprint 3, SCRUM-77 (Murat): the product manager's products, categories and stock (req 12).
// Contract: docs/API.md, "Products and categories for the product manager" (SCRUM-76).
// The routes already checked the role and the body, so this file only talks to the database.
import db from '../db/knex.js';
import { badRequest, conflict, notFound } from '../utils/httpError.js';
import { PRODUCT_COLUMNS, foldTurkish, toCategory, toProduct } from '../utils/productQuery.js';

// PostgreSQL error codes we turn into friendly answers.
const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';

// The public product columns plus cost, which only the admin routes ever send.
const ADMIN_PRODUCT_COLUMNS = [...PRODUCT_COLUMNS, 'p.cost'];

// The body field names (camelCase) and their columns.
const PRODUCT_COLUMN_OF = {
  name: 'name',
  model: 'model',
  serialNumber: 'serial_number',
  description: 'description',
  categoryId: 'category_id',
  price: 'price',
  cost: 'cost',
  quantityInStock: 'quantity_in_stock',
  warrantyStatus: 'warranty_status',
  distributor: 'distributor',
};

// One row -> the adminProduct JSON: the public product plus cost (a number, or null).
export function toAdminProduct(row) {
  return { ...toProduct(row), cost: row.cost == null ? null : Number(row.cost) };
}

// A body like { serialNumber, quantityInStock } -> { serial_number, quantity_in_stock }.
// Fields that were not sent (undefined) are left out, so PATCH only changes what was sent.
export function toProductRow(body) {
  const row = {};
  for (const [field, column] of Object.entries(PRODUCT_COLUMN_OF)) {
    if (body[field] !== undefined) row[column] = body[field];
  }
  return row;
}

// "Milk Frothers" -> "milk-frothers", "Türk Kahvesi" -> "turk-kahvesi".
export function slugify(name) {
  return foldTurkish(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');
}

function activeProducts() {
  return db('products as p')
    .join('categories as c', 'c.id', 'p.category_id')
    .select(ADMIN_PRODUCT_COLUMNS)
    .where('p.is_active', true);
}

async function findActiveProduct(id) {
  const row = await activeProducts().andWhere('p.id', id).first();
  if (!row) throw notFound('Product not found');
  return toAdminProduct(row);
}

async function checkCategoryExists(categoryId) {
  const category = await db('categories').where({ id: categoryId }).first('id');
  if (!category) {
    throw badRequest('Category not found', [{ field: 'categoryId', message: 'Category not found' }]);
  }
}

// A taken serial number gives 409 with the same message as the admin page's fake data.
function serialNumberTaken(err) {
  if (err.code === UNIQUE_VIOLATION && String(err.constraint).includes('serial_number')) {
    return conflict('A product with this serial number already exists', [
      { field: 'serialNumber', message: 'A product with this serial number already exists' },
    ]);
  }
  return err;
}

// GET /admin/products: every active product with its cost, in id order.
export async function listProducts() {
  const rows = await activeProducts().orderBy('p.id', 'asc');
  return rows.map(toAdminProduct);
}

// POST /admin/products. New products start with one (missing) photo and no sales.
export async function createProduct(body) {
  await checkCategoryExists(body.categoryId);
  let inserted;
  try {
    [inserted] = await db('products')
      .insert({ ...toProductRow(body), image_count: 1, popularity: 0, is_active: true })
      .returning('id');
  } catch (err) {
    throw serialNumberTaken(err);
  }
  return findActiveProduct(inserted.id);
}

// PATCH /admin/products/:id: changes only the fields that were sent.
export async function updateProduct(id, changes) {
  await findActiveProduct(id);
  if (changes.categoryId !== undefined) await checkCategoryExists(changes.categoryId);
  try {
    await db('products')
      .where({ id, is_active: true })
      .update({ ...toProductRow(changes), updated_at: db.fn.now() });
  } catch (err) {
    throw serialNumberTaken(err);
  }
  return findActiveProduct(id);
}

// DELETE /admin/products/:id: hides the product (is_active = false) instead of deleting the row,
// so old orders, invoices and deliveries still point to a real product (handbook 6.1).
export async function removeProduct(id) {
  const changed = await db('products')
    .where({ id, is_active: true })
    .update({ is_active: false, updated_at: db.fn.now() });
  if (!changed) throw notFound('Product not found');
}

// PATCH /admin/products/:id/stock: writes the new stock number (not an amount to add).
export async function setStock(id, quantityInStock) {
  const changed = await db('products')
    .where({ id, is_active: true })
    .update({ quantity_in_stock: quantityInStock, updated_at: db.fn.now() });
  if (!changed) throw notFound('Product not found');
  return findActiveProduct(id);
}

// POST /admin/categories. Answers the same category object as GET /categories.
export async function createCategory({ name, slug, description }) {
  const finalSlug = slug || slugify(name);
  if (!finalSlug) {
    throw badRequest('Add a slug: the name has no letters or digits to make one from', [
      { field: 'slug', message: 'Add a slug: the name has no letters or digits to make one from' },
    ]);
  }
  try {
    const [row] = await db('categories')
      .insert({ name, slug: finalSlug, description })
      .returning(['id', 'name', 'slug', 'description']);
    return toCategory({ ...row, productCount: 0 });
  } catch (err) {
    if (err.code === UNIQUE_VIOLATION) throw conflict('A category with this name or slug already exists');
    throw err;
  }
}

// DELETE /admin/categories/:id: only an empty category. Removed products still point to their
// category (old orders need them), so they count too.
export async function deleteCategory(id) {
  const category = await db('categories').where({ id }).first('id');
  if (!category) throw notFound('Category not found');
  const [{ count }] = await db('products').where({ category_id: id }).count('id as count');
  if (Number(count) > 0) throw conflict('This category still has products');
  try {
    await db('categories').where({ id }).del();
  } catch (err) {
    // A product was added to it between the count and the delete.
    if (err.code === FOREIGN_KEY_VIOLATION) throw conflict('This category still has products');
    throw err;
  }
}
