// SCRUM-50 (Murat): emailing the invoice after payment. The database and the email service
// are replaced by fakes, so no PostgreSQL and no internet are needed.
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Fake knex: answers loadInvoiceForOrder's two queries with the rows below and records the wheres.
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
vi.mock('../../src/services/email.service.js', () => ({ sendInvoiceEmail: vi.fn() }));

const { sendInvoiceEmail } = await import('../../src/services/email.service.js');
const { sendInvoiceForOrder, loadInvoiceForOrder } = await import('../../src/services/invoice.service.js');

const invoiceRow = {
  id: 7,
  orderId: 123,
  invoiceNumber: 'INV-000123',
  total: '49999.00',
  createdAt: new Date('2026-11-13T08:30:00Z'),
  userId: 1,
  deliveryAddress: 'Sabancı University, Orta Mahalle, Tuzla, İstanbul',
  cardLast4: '4242',
  name: 'Demo Customer',
  email: 'customer@crema.com',
  taxId: '1234567890',
};
const itemRows = [{ name: 'Sage The Bambino Plus', model: 'SES500 BSS', quantity: 1, unitPrice: '49999.00' }];

beforeEach(() => {
  vi.resetAllMocks();
  fake.state.calls.length = 0;
  fake.state.rows = { 'invoices as i': invoiceRow, 'order_items as oi': itemRows };
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('loadInvoiceForOrder', () => {
  it('finds the invoice by its order id', async () => {
    const invoice = await loadInvoiceForOrder(123);
    expect(invoice.invoiceNumber).toBe('INV-000123');
    expect(fake.state.calls.find((c) => c.table === 'invoices as i').wheres).toEqual([['i.order_id', 123]]);
  });
});

describe('sendInvoiceForOrder (handbook 7.4 step 7, req 4)', () => {
  it('emails the customer their invoice PDF and returns true', async () => {
    sendInvoiceEmail.mockResolvedValue({ messageId: '<1@crema>', previewUrl: 'https://ethereal.email/message/x' });

    await expect(sendInvoiceForOrder(123)).resolves.toBe(true);

    expect(sendInvoiceEmail).toHaveBeenCalledTimes(1);
    const { to, name, invoiceNumber, pdf } = sendInvoiceEmail.mock.calls[0][0];
    expect({ to, name, invoiceNumber }).toEqual({
      to: 'customer@crema.com',
      name: 'Demo Customer',
      invoiceNumber: 'INV-000123',
    });
    // A real PDF is attached, built from this order's invoice.
    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('returns false and does not throw when the email fails, so the order is kept', async () => {
    sendInvoiceEmail.mockRejectedValue(new Error('Connection timeout'));

    await expect(sendInvoiceForOrder(123)).resolves.toBe(false);
    expect(console.error).toHaveBeenCalledWith('Invoice email for order 123 was not sent: Connection timeout');
  });

  it('returns false without emailing when the order has no invoice', async () => {
    fake.state.rows['invoices as i'] = undefined;

    await expect(sendInvoiceForOrder(999)).resolves.toBe(false);
    expect(sendInvoiceEmail).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith('Invoice email for order 999 was not sent: Invoice not found');
  });

  it('returns false when the database cannot be reached', async () => {
    fake.state.rows = new Proxy(
      {},
      {
        get: () => {
          throw new Error('connect ECONNREFUSED');
        },
      },
    );

    await expect(sendInvoiceForOrder(123)).resolves.toBe(false);
    expect(sendInvoiceEmail).not.toHaveBeenCalled();
  });
});
