// Sprint 2 (Neslihan, SCRUM-57): the product manager's delivery list (req 12, handbook 8.3).
// One deliveries row is written per order item when an order is placed (SCRUM-35).
// The product manager marks deliveries completed by moving the order to DELIVERED (SCRUM-60).
import db from '../db/knex.js';

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
  const rows = await query;
  return rows.map(toDelivery);
}
