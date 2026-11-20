import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash } from 'node:crypto';
import { env } from '../../src/config/env.js';
import { cardHash, checkout } from '../../src/services/checkout.service.js';
import * as orderService from '../../src/services/order.service.js';
import * as bankService from '../../src/services/bank.service.js';
import * as invoiceService from '../../src/services/invoice.service.js';
import { conflict } from '../../src/utils/httpError.js';

// SCRUM-59: the checkout flow without a database. placeOrder is replaced by a fake that runs
// the two hooks like the real one (pay, then the writes, then afterWrite), with a fake trx
// that records every insert. The bank and the invoice service are mocked.
vi.mock('../../src/services/order.service.js', () => ({ placeOrder: vi.fn() }));
vi.mock('../../src/services/bank.service.js', () => ({ charge: vi.fn() }));
vi.mock('../../src/services/invoice.service.js', () => ({
  createInvoice: vi.fn(),
  sendInvoiceForOrder: vi.fn(),
}));

const order = {
  id: 123,
  status: 'PROCESSING',
  total: 7949.89,
  deliveryAddress: 'Orta Mahalle, Tuzla, Istanbul',
  cardLast4: '4242',
  createdAt: '2026-11-17T10:00:00.000Z',
  deliveredAt: null,
  items: [],
};
const body = {
  deliveryAddress: 'Orta Mahalle, Tuzla, Istanbul',
  card: { number: '4242424242424242', holderName: 'Demo Customer', expiryMonth: 12, expiryYear: 2029, cvv: '123' },
};

let inserts;
const trx = (table) => ({ insert: async (row) => inserts.push({ table, row }) });

// Behaves like the real placeOrder: pay runs first and a throw stops everything.
function fakePlaceOrder(total) {
  orderService.placeOrder.mockImplementation(async (userId, fields, hooks) => {
    const paid = await hooks.pay({ trx, total });
    await hooks.afterWrite({ trx, orderId: order.id, total, paid });
    return { order: { ...order, cardLast4: fields.cardLast4 }, paid };
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  inserts = [];
  bankService.charge.mockReturnValue({ approved: true, reference: 'BNK-0123456789ABCDEF' });
  invoiceService.createInvoice.mockResolvedValue({ id: 7, invoiceNumber: 'INV-000123' });
  invoiceService.sendInvoiceForOrder.mockResolvedValue(true);
});

describe('checkout', () => {
  it('charges the cart total, saves the payment and invoice, then emails it', async () => {
    fakePlaceOrder(7949.89);
    const result = await checkout(5, body);

    expect(result).toEqual({ order, invoice: { id: 7, invoiceNumber: 'INV-000123' }, emailSent: true });
    expect(orderService.placeOrder).toHaveBeenCalledWith(
      5,
      { deliveryAddress: body.deliveryAddress, cardLast4: '4242' },
      expect.any(Object),
    );
    expect(bankService.charge).toHaveBeenCalledWith({ cardNumber: '4242424242424242', amount: 7949.89 });
    expect(invoiceService.createInvoice).toHaveBeenCalledWith(trx, { orderId: 123, total: 7949.89 });
    expect(invoiceService.sendInvoiceForOrder).toHaveBeenCalledWith(123);
  });

  it('saves only the hash and last 4 digits of the card, never the number or the CVV', async () => {
    fakePlaceOrder(100);
    await checkout(5, body);

    expect(inserts).toEqual([
      {
        table: 'payments',
        row: {
          order_id: 123,
          card_hash: cardHash('4242424242424242'),
          card_last4: '4242',
          amount: 100,
          status: 'APPROVED',
          bank_reference: 'BNK-0123456789ABCDEF',
        },
      },
    ]);
    const saved = JSON.stringify(inserts);
    expect(saved).not.toContain('4242424242424242');
    expect(saved).not.toContain('"123"');
  });

  it('answers 402 when the bank says no, and writes nothing', async () => {
    fakePlaceOrder(100);
    bankService.charge.mockReturnValue({ approved: false, reference: null });

    await expect(checkout(5, body)).rejects.toMatchObject({
      status: 402,
      message: 'Payment was rejected by the bank',
    });
    expect(inserts).toEqual([]);
    expect(invoiceService.createInvoice).not.toHaveBeenCalled();
    expect(invoiceService.sendInvoiceForOrder).not.toHaveBeenCalled();
  });

  it('never calls the bank when the stock check fails first (409)', async () => {
    orderService.placeOrder.mockRejectedValue(conflict('Baratza Encore has only 0 left'));

    await expect(checkout(5, body)).rejects.toMatchObject({ status: 409 });
    expect(bankService.charge).not.toHaveBeenCalled();
    expect(invoiceService.sendInvoiceForOrder).not.toHaveBeenCalled();
  });

  it('keeps the order when the email fails: emailSent is false', async () => {
    fakePlaceOrder(100);
    invoiceService.sendInvoiceForOrder.mockResolvedValue(false);

    const result = await checkout(5, body);
    expect(result.emailSent).toBe(false);
    expect(result.order.id).toBe(123);
    expect(result.invoice).toEqual({ id: 7, invoiceNumber: 'INV-000123' });
  });
});

describe('cardHash', () => {
  it('is SHA-256 of CARD_HASH_SECRET + number: 64 hex characters, the same every time', () => {
    const expected = createHash('sha256').update(`${env.cardHashSecret}4242424242424242`).digest('hex');
    expect(cardHash('4242424242424242')).toBe(expected);
    expect(cardHash('4242424242424242')).toMatch(/^[0-9a-f]{64}$/);
    expect(cardHash('4000000000000002')).not.toBe(expected);
  });
});
