// Sprint 2 (Luis): small pure helpers for the cart rules (handbook 7.3, 8.1).
// Nothing here runs a query, so every function can be unit tested without a database.
import { badRequest } from './httpError.js';
import { toProduct } from './productQuery.js';

// The most of one product a cart line can hold (handbook 7.3: quantity 1 to 99).
export const MAX_QUANTITY = 99;

// How many of a product a cart line may hold right now: the stock, but never more than 99.
export function lineLimit(stock) {
  return Math.min(Number(stock), MAX_QUANTITY);
}

// POST /cart/items: the new quantity after adding `requested` to `current` (handbook 7.3).
// Out of stock: 400. Cart already holds all the stock: 400 "Only N in stock".
// Otherwise min(current + requested, stock), and never above 99.
export function quantityAfterAdd(current, requested, stock) {
  if (stock <= 0) throw badRequest('This product is out of stock');
  const limit = lineLimit(stock);
  if (current >= limit) {
    if (limit === MAX_QUANTITY && stock > MAX_QUANTITY) {
      throw badRequest(`You can have at most ${MAX_QUANTITY} of one product`);
    }
    throw badRequest(`Only ${stock} in stock`);
  }
  return Math.min(current + requested, limit);
}

// PATCH /cart/items/:productId: setting a quantity above the stock is a 400 (handbook 7.3).
// The 1 to 99 range is already checked by the zod schema.
export function checkSetQuantity(quantity, stock) {
  if (stock <= 0) throw badRequest('This product is out of stock');
  if (quantity > stock) throw badRequest(`Only ${stock} in stock`);
}

// POST /cart/merge (handbook 7.3): adds the guest items to the saved ones.
// existing: Map productId -> quantity already in the database cart.
// guestItems: [{ productId, quantity }] from crema_guest_cart (the same product may appear twice).
// products: Map productId -> { quantityInStock, isActive } for every product involved.
// Returns the lines to write: [{ productId, quantity }]. Products that are gone, removed or
// out of stock are dropped; quantities of the same product are added and capped at stock and 99.
// Lines already in the database whose product is still fine are left out (nothing to write).
export function mergeLines(existing, guestItems, products) {
  const added = new Map();
  for (const { productId, quantity } of guestItems) {
    added.set(productId, (added.get(productId) || 0) + quantity);
  }

  const lines = [];
  for (const [productId, guestQuantity] of added) {
    const product = products.get(productId);
    if (!product || !product.isActive || product.quantityInStock <= 0) continue;
    const quantity = Math.min((existing.get(productId) || 0) + guestQuantity, lineLimit(product.quantityInStock));
    if (quantity !== existing.get(productId)) lines.push({ productId, quantity });
  }
  return lines;
}

// Builds the Cart object of handbook 8.1 from cart rows joined with their products.
// Each row has the product columns of productQuery.js plus cartQuantity.
// itemCount counts units (2 grinders = 2); subtotal is rounded to 2 decimals.
export function buildCart(rows) {
  const items = rows.map((row) => {
    const product = toProduct(row);
    return { productId: product.id, quantity: Number(row.cartQuantity), product };
  });
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  return { items, itemCount, subtotal: Math.round(subtotal * 100) / 100 };
}
