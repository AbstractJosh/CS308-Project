// Sprint 2 (Luis): place an order in one transaction (handbook 7.4, SCRUM-35).
// Stock goes down and never below zero, popularity (units sold) goes up, the cart is emptied.
// If any step fails, the transaction rolls back and nothing is saved.
//
// The checkout API (POST /checkout) plugs the bank, the payment row and the invoice in
// through the two hooks of placeOrder, so they run inside the same transaction:
//   placeOrder(userId, { deliveryAddress, cardLast4 }, {
//     pay: async ({ trx, total }) => ...,               // after the stock check, before any write
//     afterWrite: async ({ trx, orderId, total, paid }) => ...,  // before the commit
//   });
// Whatever pay returns is passed on as `paid`. Throwing from a hook (for example the 402
// "Payment was rejected by the bank") rolls everything back.
import db from '../db/knex.js';
import { badRequest, conflict, notFound } from '../utils/httpError.js';
import { buildOrderLines, checkStock, orderTotal, toOrder } from '../utils/orderUtils.js';

// Locks the user's cart and the products in it, then checks the stock (handbook 7.4 steps 2-3).
// Returns { cartId, lines, total }. Empty cart: 400. Not enough stock: 409.
async function lockCartForOrder(trx, userId) {
  // Locking the cart row first means two checkouts of the same user run one after the other:
  // the second one then finds an empty cart instead of ordering the same items twice.
  // NO KEY UPDATE (not UPDATE) so the cart routes, which only need the cart's key, never wait on it.
  const cart = await trx('carts').where({ user_id: userId }).forNoKeyUpdate().first('id');
  if (!cart) throw badRequest('Your cart is empty');

  const cartLines = await trx('cart_items')
    .where({ cart_id: cart.id })
    .orderBy('id', 'asc')
    .select('product_id', 'quantity');
  if (cartLines.length === 0) throw badRequest('Your cart is empty');

  // Lock in id order, like the cart merge, so two checkouts touching the same products cannot
  // deadlock. Until the commit nobody else can change this stock (handbook 7.8).
  const productRows = await trx('products')
    .whereIn(
      'id',
      cartLines.map((line) => line.productId),
    )
    .orderBy('id', 'asc')
    .forUpdate()
    .select('id', 'name', 'model', 'price', 'cost', 'quantity_in_stock', 'is_active');
  const products = new Map(productRows.map((product) => [product.id, product]));

  const lines = buildOrderLines(cartLines, products);
  if (lines.length === 0) throw badRequest('Your cart is empty');
  checkStock(lines);

  return { cartId: cart.id, lines, total: orderTotal(lines) };
}

// Writes the order, its items and one delivery row per item, takes the stock and adds the
// popularity, and empties the cart (handbook 7.4 steps 5-6). Returns the new order id.
async function writeOrder(trx, userId, { cartId, lines, total }, { deliveryAddress, cardLast4 }) {
  const [order] = await trx('orders')
    .insert({ user_id: userId, total, delivery_address: deliveryAddress, card_last4: cardLast4 })
    .returning('id');

  const items = await trx('order_items')
    .insert(
      lines.map((line) => ({
        order_id: order.id,
        product_id: line.productId,
        quantity: line.quantity,
        unit_price: line.unitPrice,
        unit_cost: line.unitCost,
      })),
    )
    .returning(['id', 'product_id']);

  // The product manager's delivery list (req 12): one row per order item.
  const itemIds = new Map(items.map((item) => [item.productId, item.id]));
  await trx('deliveries').insert(
    lines.map((line) => ({
      order_id: order.id,
      order_item_id: itemIds.get(line.productId),
      customer_id: userId,
      product_id: line.productId,
      quantity: line.quantity,
      total_price: line.lineTotal,
      delivery_address: deliveryAddress,
    })),
  );

  for (const line of lines) {
    // The rows are locked and checkStock passed, so this always matches one row. The extra
    // condition (and the CHECK quantity_in_stock >= 0) still guards against going below zero.
    const updated = await trx('products')
      .where({ id: line.productId })
      .andWhere('quantity_in_stock', '>=', line.quantity)
      .update({
        quantity_in_stock: trx.raw('quantity_in_stock - ?', [line.quantity]),
        popularity: trx.raw('popularity + ?', [line.quantity]),
        updated_at: trx.fn.now(),
      });
    if (updated !== 1) throw conflict(`${line.name} has only ${line.stock} left`);
  }

  // Removed products the order left out go too: they can no longer be bought.
  await trx('cart_items').where({ cart_id: cartId }).del();
  return order.id;
}

// GET-style read of one order as the Order object of handbook 8.1. Pass trx to read inside
// a transaction. Owner and staff checks belong to the route that calls this.
export async function getOrder(orderId, trx = db) {
  const order = await trx('orders')
    .where({ id: orderId })
    .first('id', 'status', 'total', 'delivery_address', 'card_last4', 'created_at', 'delivered_at');
  if (!order) throw notFound('Order not found');

  const items = await trx('order_items as oi')
    .join('products as p', 'p.id', 'oi.product_id')
    .where('oi.order_id', orderId)
    .orderBy('oi.id', 'asc')
    .select('oi.id', 'oi.product_id', 'p.name', 'p.model', 'oi.quantity', 'oi.unit_price');
  return toOrder(order, items);
}

// Places the user's cart as one order, all or nothing (handbook 7.4). Returns { order, paid }.
// deliveryAddress and cardLast4 come already validated from the checkout route.
export async function placeOrder(userId, { deliveryAddress, cardLast4 }, hooks = {}) {
  return db.transaction(async (trx) => {
    const prepared = await lockCartForOrder(trx, userId);
    const paid = hooks.pay ? await hooks.pay({ trx, total: prepared.total }) : undefined;
    const orderId = await writeOrder(trx, userId, prepared, { deliveryAddress, cardLast4 });
    if (hooks.afterWrite) await hooks.afterWrite({ trx, orderId, total: prepared.total, paid });
    return { order: await getOrder(orderId, trx), paid };
  });
}
