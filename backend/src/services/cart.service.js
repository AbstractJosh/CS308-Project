// Sprint 2 (Luis): cart rules and queries for logged-in users (handbook 7.3, 8.3).
// Guests keep their cart in localStorage; it reaches the database through mergeCart at login.
// Every function gets plain values (userId, productId, ...) and returns the whole Cart.
import db from '../db/knex.js';
import { notFound } from '../utils/httpError.js';
import { PRODUCT_COLUMNS } from '../utils/productQuery.js';
import { buildCart, checkSetQuantity, mergeLines, quantityAfterAdd } from '../utils/cartUtils.js';

// GET /cart. A user without a cart row simply has an empty cart.
// Removed products (is_active = false) are not shown. Lines keep the order they were added in.
export async function getCart(userId) {
  const rows = await db('cart_items as ci')
    .join('carts as ct', 'ct.id', 'ci.cart_id')
    .join('products as p', 'p.id', 'ci.product_id')
    .join('categories as c', 'c.id', 'p.category_id')
    .where('ct.user_id', userId)
    .andWhere('p.is_active', true)
    .select([...PRODUCT_COLUMNS, 'ci.quantity as cart_quantity'])
    .orderBy('ci.id', 'asc');
  return buildCart(rows);
}

// The user's cart id, creating the cart row the first time. onConflict keeps this safe
// when two requests of the same user create it at the same time (carts.user_id is unique).
async function cartIdFor(trx, userId) {
  await trx('carts').insert({ user_id: userId }).onConflict('user_id').ignore();
  const cart = await trx('carts').where({ user_id: userId }).first('id');
  return cart.id;
}

// Locks the product row until the transaction ends, so the stock we check cannot change
// under us (handbook 7.8). A missing or removed product is a 404.
async function lockActiveProduct(trx, productId) {
  const product = await trx('products')
    .where({ id: productId })
    .forUpdate()
    .first('id', 'quantity_in_stock', 'is_active');
  if (!product || !product.isActive) throw notFound('Product not found');
  return product;
}

// Writes one cart line, or updates its quantity if the product is already in the cart.
function upsertLines(trx, cartId, lines) {
  return trx('cart_items')
    .insert(lines.map(({ productId, quantity }) => ({ cart_id: cartId, product_id: productId, quantity })))
    .onConflict(['cart_id', 'product_id'])
    .merge(['quantity']);
}

// POST /cart/items { productId, quantity }. New quantity = min(current + quantity, stock).
export async function addItem(userId, { productId, quantity }) {
  await db.transaction(async (trx) => {
    const product = await lockActiveProduct(trx, productId);
    const cartId = await cartIdFor(trx, userId);
    const line = await trx('cart_items').where({ cart_id: cartId, product_id: productId }).first('quantity');
    const newQuantity = quantityAfterAdd(line ? line.quantity : 0, quantity, product.quantityInStock);
    await upsertLines(trx, cartId, [{ productId, quantity: newQuantity }]);
  });
  return getCart(userId);
}

// PATCH /cart/items/:productId { quantity }. Sets the quantity; above stock is a 400.
export async function updateQuantity(userId, productId, quantity) {
  await db.transaction(async (trx) => {
    const product = await lockActiveProduct(trx, productId);
    const line = await trx('cart_items as ci')
      .join('carts as ct', 'ct.id', 'ci.cart_id')
      .where({ 'ct.user_id': userId, 'ci.product_id': productId })
      .first('ci.id');
    if (!line) throw notFound('This product is not in your cart');
    checkSetQuantity(quantity, product.quantityInStock);
    await trx('cart_items').where({ id: line.id }).update({ quantity });
  });
  return getCart(userId);
}

// Only this user's cart lines, as a subquery: carts.id where user_id = userId.
function userCartIds(userId) {
  return db('carts').select('id').where({ user_id: userId });
}

// DELETE /cart/items/:productId. Removing a product that is not in the cart is not an error.
export async function removeItem(userId, productId) {
  await db('cart_items').whereIn('cart_id', userCartIds(userId)).andWhere({ product_id: productId }).del();
  return getCart(userId);
}

// DELETE /cart. Empties the cart; the cart row itself stays.
export async function clearCart(userId) {
  await db('cart_items').whereIn('cart_id', userCartIds(userId)).del();
  return getCart(userId);
}

// POST /cart/merge { items } at login (handbook 7.3): quantities of the same product are
// added and capped at stock; products that are gone or out of stock are dropped.
// One transaction, so a failure leaves the saved cart as it was.
export async function mergeCart(userId, items) {
  if (items.length > 0) {
    await db.transaction(async (trx) => {
      const ids = [...new Set(items.map((item) => item.productId))];
      // Lock in id order so two merges touching the same products cannot deadlock.
      const productRows = await trx('products')
        .whereIn('id', ids)
        .orderBy('id', 'asc')
        .forUpdate()
        .select('id', 'quantity_in_stock', 'is_active');
      const products = new Map(productRows.map((p) => [p.id, p]));

      const cartId = await cartIdFor(trx, userId);
      const existingRows = await trx('cart_items').where({ cart_id: cartId }).select('product_id', 'quantity');
      const existing = new Map(existingRows.map((row) => [row.productId, row.quantity]));

      const lines = mergeLines(existing, items, products);
      if (lines.length > 0) await upsertLines(trx, cartId, lines);
    });
  }
  return getCart(userId);
}
