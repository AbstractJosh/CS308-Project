// Sprint 2 (Neslihan, SCRUM-57): the product manager's delivery list (req 12, handbook 8.3).
// One deliveries row is written per order item when an order is placed (SCRUM-35).
// The product manager marks deliveries completed by moving the order to DELIVERED (SCRUM-60).
import db from '../db/knex.js';
import { badRequest, notFound } from '../utils/httpError.js';
import { getOrder } from './order.service.js';

// One row of GET /admin/deliveries in the handbook 8.3 shape. Keys are camelCase already.
export function toDelivery(row) {
  return {
    id: row.id,
    orderId: row.orderId,
    customerId: row.customerId,
    productId: row.productId,
    productName: row.productName,
    quantity: Number(row.quantity),
    totalPrice: Number(row.totalPrice), // pg returns DECIMAL as a string
    deliveryAddress: row.deliveryAddress,
    completed: Boolean(row.completed),
    orderStatus: row.orderStatus,
  };
}

// All deliveries, or only open (completed = false) or done (completed = true) ones.
// Open ones first, then the newest first, so the product manager sees the work to do on top.
export async function listDeliveries({ completed } = {}) {
  const query = db('deliveries as d')
    .join('orders as o', 'o.id', 'd.order_id')
    .join('products as p', 'p.id', 'd.product_id')
    .select(
      'd.id',
      'd.order_id',
      'd.customer_id',
      'd.product_id',
      'p.name as product_name',
      'd.quantity',
      'd.total_price',
      'd.delivery_address',
      'd.completed',
      'o.status as order_status',
    )
    .orderBy([
      { column: 'd.completed', order: 'asc' },
      { column: 'd.id', order: 'desc' },
    ]);
  if (completed !== undefined) query.where('d.completed', completed);
  // SCRUM-81: a cancelled order has nothing left to deliver, so it is never open work.
  if (completed === false) query.whereNot('o.status', 'CANCELLED');
  const rows = await query;
  return rows.map(toDelivery);
}

// SCRUM-60: the only allowed moves (handbook 7.5). The product manager moves an order forward
// one step at a time; a cancelled or delivered order never moves again.
export const NEXT_STATUS = { PROCESSING: 'IN_TRANSIT', IN_TRANSIT: 'DELIVERED' };

// The 400 message for a move that is not allowed, e.g. PROCESSING straight to DELIVERED.
export function moveError(current, wanted) {
  const next = NEXT_STATUS[current];
  if (!next) return `This order is ${current} and cannot be moved any more`;
  return `This order is ${current}, so it can only be moved to ${next}, not ${wanted}`;
}

// PATCH /admin/orders/:id/status. One transaction: the order row is locked first, so two
// product managers clicking at the same time cannot both move it. DELIVERED also sets
// delivered_at and marks every delivery row of the order completed (req 12).
// Returns the updated Order object (handbook 8.1). Unknown order: 404. Bad move: 400.
export async function updateOrderStatus(orderId, status) {
  return db.transaction(async (trx) => {
    const order = await trx('orders').where({ id: orderId }).forUpdate().first('id', 'status');
    if (!order) throw notFound('Order not found');
    if (NEXT_STATUS[order.status] !== status) throw badRequest(moveError(order.status, status));

    const changes = { status, updated_at: trx.fn.now() };
    if (status === 'DELIVERED') changes.delivered_at = trx.fn.now();
    await trx('orders').where({ id: orderId }).update(changes);
    if (status === 'DELIVERED') await trx('deliveries').where({ order_id: orderId }).update({ completed: true });

    return getOrder(orderId, trx);
  });
}
