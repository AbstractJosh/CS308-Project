// Sprint 2, SCRUM-49 (Murat): invoices (handbook 6.2, 7.4 and 7.6).
//
// The checkout (POST /checkout, SCRUM-59) writes the invoice inside its transaction,
// through placeOrder's afterWrite hook (handbook 7.4 step 5):
//   afterWrite: async ({ trx, orderId, total }) => {
//     const invoice = await invoiceService.createInvoice(trx, { orderId, total });
//     ...
//   }
// If anything later in the checkout fails, the transaction rolls back and the invoice is gone too.
import db from '../db/knex.js';
import { forbidden, notFound } from '../utils/httpError.js';
import { buildInvoicePdf, invoiceNumberFor } from '../utils/invoicePdf.js';

// Besides the customer who placed the order, these roles may open any invoice (handbook 7.6).
export const INVOICE_STAFF_ROLES = ['PRODUCT_MANAGER', 'SALES_MANAGER'];

// Writes the invoice of an order. trx is the checkout's transaction.
// Returns { id, invoiceNumber }, e.g. { id: 7, invoiceNumber: 'INV-000123' } for order 123.
// The database refuses a second invoice for the same order (order_id is unique).
export async function createInvoice(trx, { orderId, total }) {
  const [invoice] = await trx('invoices')
    .insert({ order_id: orderId, invoice_number: invoiceNumberFor(orderId), total })
    .returning(['id', 'invoice_number']);
  return { id: invoice.id, invoiceNumber: invoice.invoiceNumber };
}

// true if this logged-in user may see an invoice whose order belongs to ownerId.
// user is req.user ({ id, role }) from the login token.
export function canViewInvoice(user, ownerId) {
  if (!user) return false;
  return Number(user.id) === Number(ownerId) || INVOICE_STAFF_ROLES.includes(user.role);
}

// Loads one invoice with everything the PDF needs, in the shape buildInvoicePdf expects,
// plus orderId and userId (the customer). Unknown id: 404.
export async function loadInvoice(invoiceId) {
  const row = await db('invoices as i')
    .join('orders as o', 'o.id', 'i.order_id')
    .join('users as u', 'u.id', 'o.user_id')
    .where('i.id', invoiceId)
    .first(
      'i.id',
      'i.order_id',
      'i.invoice_number',
      'i.total',
      'i.created_at',
      'o.user_id',
      'o.delivery_address',
      'o.card_last4',
      'u.name',
      'u.email',
      'u.tax_id',
    );
  if (!row) throw notFound('Invoice not found');

  // The price paid is the order item's unit_price, saved at sale time, not today's price.
  const items = await db('order_items as oi')
    .join('products as p', 'p.id', 'oi.product_id')
    .where('oi.order_id', row.orderId)
    .orderBy('oi.id', 'asc')
    .select('p.name', 'p.model', 'oi.quantity', 'oi.unit_price');

  return {
    id: row.id,
    orderId: row.orderId,
    userId: row.userId,
    invoiceNumber: row.invoiceNumber,
    createdAt: row.createdAt,
    customer: { name: row.name, email: row.email, taxId: row.taxId },
    deliveryAddress: row.deliveryAddress,
    cardLast4: row.cardLast4,
    items: items.map((item) => ({
      name: item.name,
      model: item.model,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
    })),
    total: Number(row.total),
  };
}

// GET /invoices/:id/pdf: the invoice as a PDF, for the order's customer and the managers only.
// Returns { invoiceNumber, pdf } where pdf is a Buffer. 404 if missing, 403 for anyone else.
export async function getInvoicePdf(invoiceId, user) {
  const invoice = await loadInvoice(invoiceId);
  if (!canViewInvoice(user, invoice.userId)) throw forbidden();
  const pdf = await buildInvoicePdf(invoice);
  return { invoiceNumber: invoice.invoiceNumber, pdf };
}
