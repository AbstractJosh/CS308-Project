// Sprint 2 (Luis): small pure helpers for placing an order (handbook 7.4, 8.1).
// Nothing here runs a query, so every function can be unit tested without a database.
import { conflict } from './httpError.js';

// Money is DECIMAL(10,2) in the database: round to cents so 0.1 + 0.2 never shows up.
export function roundMoney(amount) {
  return Math.round(Number(amount) * 100) / 100;
}

// The cost saved with an order item: the product's cost, or 50% of the price when cost is
// null (handbook 6.2). Profit (Sprint 4) uses this, so later cost changes never change old orders.
export function unitCostFor(price, cost) {
  return cost === null || cost === undefined ? roundMoney(Number(price) / 2) : roundMoney(cost);
}

// Turns the cart lines and their locked product rows into the lines of the order.
// cartLines: [{ productId, quantity }] from cart_items.
// products: Map productId -> { id, name, model, price, cost, quantityInStock, isActive }.
// Removed products (is_active = false, or gone) are left out, the same way the cart page hides
// them, so the customer pays for exactly what the cart showed. Prices are copied now (handbook 6.2).
export function buildOrderLines(cartLines, products) {
  const lines = [];
  for (const { productId, quantity } of cartLines) {
    const product = products.get(productId);
    if (!product || !product.isActive) continue;
    const unitPrice = roundMoney(product.price);
    lines.push({
      productId,
      name: product.name,
      model: product.model,
      quantity: Number(quantity),
      stock: Number(product.quantityInStock),
      unitPrice,
      unitCost: unitCostFor(product.price, product.cost),
      lineTotal: roundMoney(unitPrice * Number(quantity)),
    });
  }
  return lines;
}

// Every line must fit in the stock, so stock never goes below zero (handbook 7.4 step 3).
// Otherwise 409 with one detail per short product: "<name> has only N left".
export function checkStock(lines) {
  const details = lines
    .filter((line) => line.quantity > line.stock)
    .map((line) => ({ field: 'productId', message: `${line.name} has only ${line.stock} left` }));
  if (details.length > 0) throw conflict(details[0].message, details);
}

// The order total: the sum of the line totals, rounded to cents.
export function orderTotal(lines) {
  return roundMoney(lines.reduce((sum, line) => sum + line.lineTotal, 0));
}

// Builds the Order object of handbook 8.1 from an orders row and its order_items rows
// (each item row joined with its product's name and model). Keys are camelCase already.
export function toOrder(orderRow, itemRows) {
  return {
    id: orderRow.id,
    status: orderRow.status,
    total: Number(orderRow.total), // pg returns DECIMAL as a string
    deliveryAddress: orderRow.deliveryAddress,
    cardLast4: orderRow.cardLast4,
    createdAt: orderRow.createdAt,
    deliveredAt: orderRow.deliveredAt ?? null,
    items: itemRows.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.name,
      model: item.model,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
    })),
  };
}
