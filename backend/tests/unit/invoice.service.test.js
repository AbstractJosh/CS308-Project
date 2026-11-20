// SCRUM-49 (Murat): the invoice service. The database is replaced by small fakes,
// so these tests need no PostgreSQL.
import { describe, it, expect, vi, beforeEach } from 'vitest';

// A fake knex for loadInvoice: db('table') returns a chain whose final call answers with
// the rows set in `rows`. Every call is recorded so the tests can check the query.
const fake = vi.hoisted(() => {
  const state = { rows: {}, calls: [] };
  const chain = (table) => {
    const call = { table, wheres: [] };
    state.calls.push(call);
    const builder = {
      join: () => builder,
      orderBy: () => builder,
      where: (column, value) => {
        call.wheres.push([column, value]);
        return builder;
      },
      first: async () => state.rows[table],
      select: async () => state.rows[table],
    };
    return builder;
  };
  return { state, db: chain };
});
vi.mock('../../src/db/knex.js', () => ({ default: fake.db }));

const { canViewInvoice, createInvoice, getInvoicePdf, loadInvoice, INVOICE_STAFF_ROLES } = await import(
  '../../src/services/invoice.service.js'
);

// One invoice row and its items as the database returns them (camelCase, money as strings).
const invoiceRow = {
  id: 7,
  orderId: 123,
  invoiceNumber: 'INV-000123',
  total: '50836.00',
  createdAt: new Date('2026-11-12T08:30:00Z'),
  userId: 1,
  deliveryAddress: 'Sabancı University, Orta Mahalle, Tuzla, İstanbul',
  cardLast4: '4242',
  name: 'Demo Customer',
  email: 'customer@crema.com',
  taxId: '1234567890',
};
const itemRows = [
  { name: 'Sage The Bambino Plus', model: 'SES500 BSS', quantity: 1, unitPrice: '49999.00' },
  { name: 'Hola Sol Turkish Coffee 250 g', model: 'Turkish Coffee 250 g', quantity: 3, unitPrice: '279.00' },
];

beforeEach(() => {
  fake.state.calls.length = 0;
  fake.state.rows = { 'invoices as i': invoiceRow, 'order_items as oi': itemRows };
});

describe('createInvoice', () => {
  it('writes INV- plus the 6-digit order id inside the given transaction', async () => {
    const inserted = [];
    const trx = (table) => ({
      insert: (row) => {
        inserted.push({ table, row });
        return { returning: async () => [{ id: 7, invoiceNumber: row.invoice_number }] };
      },
    });

    const invoice = await createInvoice(trx, { orderId: 123, total: 50836 });

    expect(inserted).toEqual([
      { table: 'invoices', row: { order_id: 123, invoice_number: 'INV-000123', total: 50836 } },
    ]);
    expect(invoice).toEqual({ id: 7, invoiceNumber: 'INV-000123' });
  });
});

describe('canViewInvoice (handbook 7.6)', () => {
  it('lets the customer who placed the order see it', () => {
    expect(canViewInvoice({ id: 1, role: 'CUSTOMER' }, 1)).toBe(true);
    // The token id and the database id may differ in type; the value is what counts.
    expect(canViewInvoice({ id: '1', role: 'CUSTOMER' }, 1)).toBe(true);
  });

  it('lets product and sales managers see every invoice', () => {
    expect(INVOICE_STAFF_ROLES).toEqual(['PRODUCT_MANAGER', 'SALES_MANAGER']);
    expect(canViewInvoice({ id: 9, role: 'PRODUCT_MANAGER' }, 1)).toBe(true);
    expect(canViewInvoice({ id: 9, role: 'SALES_MANAGER' }, 1)).toBe(true);
  });

  it('refuses other customers, support agents and anonymous users', () => {
    expect(canViewInvoice({ id: 2, role: 'CUSTOMER' }, 1)).toBe(false);
    expect(canViewInvoice({ id: 9, role: 'SUPPORT_AGENT' }, 1)).toBe(false);
    expect(canViewInvoice(undefined, 1)).toBe(false);
  });
});

describe('loadInvoice', () => {
  it('returns the invoice in the shape the PDF needs, with money as numbers', async () => {
    const invoice = await loadInvoice(7);
    expect(invoice).toEqual({
      id: 7,
      orderId: 123,
      userId: 1,
      invoiceNumber: 'INV-000123',
      createdAt: invoiceRow.createdAt,
      customer: { name: 'Demo Customer', email: 'customer@crema.com', taxId: '1234567890' },
      deliveryAddress: 'Sabancı University, Orta Mahalle, Tuzla, İstanbul',
      cardLast4: '4242',
      items: [
        { name: 'Sage The Bambino Plus', model: 'SES500 BSS', quantity: 1, unitPrice: 49999 },
        { name: 'Hola Sol Turkish Coffee 250 g', model: 'Turkish Coffee 250 g', quantity: 3, unitPrice: 279 },
      ],
      total: 50836,
    });
    // The items are read for this invoice's order, not for the invoice id.
    expect(fake.state.calls.find((c) => c.table === 'order_items as oi').wheres).toEqual([['oi.order_id', 123]]);
  });

  it('answers 404 for an unknown invoice', async () => {
    fake.state.rows['invoices as i'] = undefined;
    await expect(loadInvoice(999)).rejects.toMatchObject({ status: 404, message: 'Invoice not found' });
  });
});

describe('getInvoicePdf', () => {
  it('builds the PDF for the owner', async () => {
    const { invoiceNumber, pdf } = await getInvoicePdf(7, { id: 1, role: 'CUSTOMER' });
    expect(invoiceNumber).toBe('INV-000123');
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('answers 403 to another customer, without building the PDF', async () => {
    await expect(getInvoicePdf(7, { id: 2, role: 'CUSTOMER' })).rejects.toMatchObject({ status: 403 });
  });
});
