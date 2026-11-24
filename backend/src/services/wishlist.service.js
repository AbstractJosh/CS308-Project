// Sprint 3 (Ulukan, SCRUM-80): the customer's wishlist (handbook 7.7, 8.4).
// Every function returns the whole wishlist as Product objects (handbook 8.1).
import db from '../db/knex.js';
import { notFound } from '../utils/httpError.js';
import { PRODUCT_COLUMNS, toProduct } from '../utils/productQuery.js';

// GET /wishlist. Removed products (is_active = false) are not shown. Oldest first, like the cart.
export async function getWishlist(userId) {
  const rows = await db('wishlist_items as w')
    .join('products as p', 'p.id', 'w.product_id')
    .join('categories as c', 'c.id', 'p.category_id')
    .where('w.user_id', userId)
    .andWhere('p.is_active', true)
    .select(PRODUCT_COLUMNS)
    .orderBy([{ column: 'w.created_at' }, { column: 'p.id' }]);
  return rows.map(toProduct);
}

// POST /wishlist { productId }. A missing or removed product is a 404.
// Adding a product that is already there is not an error (the primary key keeps one row).
export async function addProduct(userId, productId) {
  const product = await db('products').where({ id: productId, is_active: true }).first('id');
  if (!product) throw notFound('Product not found');
  await db('wishlist_items')
    .insert({ user_id: userId, product_id: productId })
    .onConflict(['user_id', 'product_id'])
    .ignore();
  return getWishlist(userId);
}

// DELETE /wishlist/:productId. Removing a product that is not there is not an error.
export async function removeProduct(userId, productId) {
  await db('wishlist_items').where({ user_id: userId, product_id: productId }).del();
  return getWishlist(userId);
}
