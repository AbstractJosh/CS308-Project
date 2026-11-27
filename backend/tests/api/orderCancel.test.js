import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { signToken } from '../../src/utils/jwt.js';
import { badRequest, forbidden, notFound } from '../../src/utils/httpError.js';
import * as orderService from '../../src/services/order.service.js';

// SCRUM-81 (Ulukan): POST /orders/:id/cancel. The service is mocked, so these tests check the
// route: login, the customer role, the id check, the { order } shape and the service errors.
vi.mock('../../src/services/order.service.js', () => ({ cancelOrder: vi.fn() }));

const bearer = (role, id = 7) => ({ Authorization: `Bearer ${signToken({ id, role })}` });
const order = {
  id: 3,
  status: 'CANCELLED',
  total: 8398,
  deliveryAddress: 'Orta Mahalle, Tuzla, Istanbul',
  cardLast4: '4242',
  createdAt: '2026-11-27T10:00:00.000Z',
  deliveredAt: null,
  items: [{ id: 5, productId: 40, name: 'Zassenhaus Manaos Hand Grinder', model: '040', quantity: 2, unitPrice: 4199 }],
};
const cancel = (id, role = 'CUSTOMER') => request(app).post(`/api/orders/${id}/cancel`).set(bearer(role));

beforeEach(() => vi.resetAllMocks());

describe('POST /api/orders/:id/cancel', () => {
  it('answers 401 without a token', async () => {
    const res = await request(app).post('/api/orders/3/cancel');
    expect(res.status).toBe(401);
    expect(orderService.cancelOrder).not.toHaveBeenCalled();
  });

  it.each(['PRODUCT_MANAGER', 'SALES_MANAGER', 'SUPPORT_AGENT'])('answers 403 to a %s', async (role) => {
    const res = await cancel(3, role);
    expect(res.status).toBe(403);
    expect(orderService.cancelOrder).not.toHaveBeenCalled();
  });

  it('answers 400 for a bad id', async () => {
    const res = await cancel('abc');
    expect(res.status).toBe(400);
    expect(orderService.cancelOrder).not.toHaveBeenCalled();
  });

  it("cancels the customer's order and answers 200 with { order }", async () => {
    orderService.cancelOrder.mockResolvedValue(order);
    const res = await cancel(3);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ order });
    expect(orderService.cancelOrder).toHaveBeenCalledWith(3, 7);
  });

  it('passes the service errors on: 404 unknown, 403 not yours, 400 not PROCESSING', async () => {
    orderService.cancelOrder.mockRejectedValueOnce(notFound('Order not found'));
    expect((await cancel(99)).body).toEqual({ error: 'Order not found' });

    orderService.cancelOrder.mockRejectedValueOnce(forbidden());
    expect((await cancel(4)).status).toBe(403);

    const message = 'This order is IN_TRANSIT, so it can no longer be cancelled';
    orderService.cancelOrder.mockRejectedValueOnce(badRequest(message));
    const res = await cancel(3);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: message });
  });
});
