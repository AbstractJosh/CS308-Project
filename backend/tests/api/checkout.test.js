import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { signToken } from '../../src/utils/jwt.js';
import { badRequest, conflict } from '../../src/utils/httpError.js';
import * as checkoutService from '../../src/services/checkout.service.js';

// SCRUM-59: POST /checkout (handbook 8.3). The service is mocked, so these tests check the
// route: login, customers only, the body checks, the 201 shape and the error codes.
vi.mock('../../src/services/checkout.service.js', async (importOriginal) => ({
  ...(await importOriginal()),
  checkout: vi.fn(),
}));

const bearer = (id, role = 'CUSTOMER') => ({ Authorization: `Bearer ${signToken({ id, role })}` });
const body = () => ({
  deliveryAddress: '  Orta Mahalle, Tuzla, Istanbul  ',
  card: { number: '4242 4242 4242 4242', holderName: 'Demo Customer', expiryMonth: 12, expiryYear: 2099, cvv: '012' },
});
const result = {
  order: {
    id: 123,
    status: 'PROCESSING',
    total: 7499.9,
    deliveryAddress: 'Orta Mahalle, Tuzla, Istanbul',
    cardLast4: '4242',
    createdAt: '2026-11-17T10:00:00.000Z',
    deliveredAt: null,
    items: [{ id: 30, productId: 2, name: 'Baratza Encore', model: 'ESP', quantity: 1, unitPrice: 7499.9 }],
  },
  invoice: { id: 7, invoiceNumber: 'INV-000123' },
  emailSent: true,
};

beforeEach(() => vi.resetAllMocks());

describe('POST /api/checkout', () => {
  it('answers 401 without a token', async () => {
    const res = await request(app).post('/api/checkout').send(body());
    expect(res.status).toBe(401);
    expect(checkoutService.checkout).not.toHaveBeenCalled();
  });

  it('answers 403 for staff: only customers buy', async () => {
    const res = await request(app).post('/api/checkout').set(bearer(2, 'PRODUCT_MANAGER')).send(body());
    expect(res.status).toBe(403);
    expect(checkoutService.checkout).not.toHaveBeenCalled();
  });

  it('answers 201 { order, invoice, emailSent } and passes the cleaned body on', async () => {
    checkoutService.checkout.mockResolvedValue(result);
    const res = await request(app).post('/api/checkout').set(bearer(5)).send(body());

    expect(res.status).toBe(201);
    expect(res.body).toEqual(result);
    expect(checkoutService.checkout).toHaveBeenCalledWith(5, {
      deliveryAddress: 'Orta Mahalle, Tuzla, Istanbul',
      card: { number: '4242424242424242', holderName: 'Demo Customer', expiryMonth: 12, expiryYear: 2099, cvv: '012' },
    });
  });

  it('answers 400 with details for a bad card or address, before touching the cart', async () => {
    const bad = body();
    bad.deliveryAddress = 'short';
    bad.card.number = '4242 4242 4242 4241';
    const res = await request(app).post('/api/checkout').set(bearer(5)).send(bad);

    expect(res.status).toBe(400);
    expect(res.body.details).toEqual([
      { field: 'deliveryAddress', message: 'Delivery address must be 10 to 300 characters' },
      { field: 'card.number', message: 'Enter a valid card number' },
    ]);
    expect(checkoutService.checkout).not.toHaveBeenCalled();
  });

  it('answers 400 "Card details are required" without a card', async () => {
    const res = await request(app)
      .post('/api/checkout')
      .set(bearer(5))
      .send({ deliveryAddress: 'Orta Mahalle, Tuzla, Istanbul' });
    expect(res.status).toBe(400);
    expect(res.body.details).toEqual([{ field: 'card', message: 'Card details are required' }]);
  });

  it.each([
    [badRequest('Your cart is empty'), 400, 'Your cart is empty'],
    [checkoutService.paymentRejected(), 402, 'Payment was rejected by the bank'],
    [conflict('Baratza Encore has only 0 left'), 409, 'Baratza Encore has only 0 left'],
  ])('passes the service error on: %s', async (error, status, message) => {
    checkoutService.checkout.mockRejectedValue(error);
    const res = await request(app).post('/api/checkout').set(bearer(5)).send(body());
    expect(res.status).toBe(status);
    expect(res.body.error).toBe(message);
  });
});
