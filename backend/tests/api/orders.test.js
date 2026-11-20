import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { signToken } from '../../src/utils/jwt.js';
import { forbidden, notFound } from '../../src/utils/httpError.js';
import * as orderService from '../../src/services/order.service.js';

// SCRUM-105: GET /orders and GET /orders/:id (handbook 8.3). The service is mocked, so these
// tests check the route: login, the id check, the { orders } / { order } shape and the errors.
vi.mock('../../src/services/order.service.js', () => ({
  listOrders: vi.fn(),
  getOrderForUser: vi.fn(),
}));

const bearer = (id, role = 'CUSTOMER') => ({ Authorization: `Bearer ${signToken({ id, role })}` });
const order = (id, createdAt) => ({
  id,
  status: 'PROCESSING',
  total: 8849.87,
  deliveryAddress: 'Orta Mahalle, Tuzla, Istanbul',
  cardLast4: '4242',
  createdAt,
  deliveredAt: null,
  items: [{ id: 30, productId: 2, name: 'Baratza Encore', model: 'ESP', quantity: 1, unitPrice: 7499.9 }],
});

beforeEach(() => vi.resetAllMocks());

describe('GET /api/orders', () => {
  it('answers 401 without a token', async () => {
    const res = await request(app).get('/api/orders');
    expect(res.status).toBe(401);
    expect(orderService.listOrders).not.toHaveBeenCalled();
  });

  it("answers 200 with the logged-in user's { orders }, as the service sorted them", async () => {
    const orders = [order(12, '2026-11-12T10:00:00.000Z'), order(9, '2026-11-01T10:00:00.000Z')];
    orderService.listOrders.mockResolvedValue(orders);
    const res = await request(app).get('/api/orders').set(bearer(4));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ orders });
    expect(orderService.listOrders).toHaveBeenCalledWith(4);
  });

  it('answers { orders: [] } for a user without orders', async () => {
    orderService.listOrders.mockResolvedValue([]);
    const res = await request(app).get('/api/orders').set(bearer(4));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ orders: [] });
  });
});

describe('GET /api/orders/:id', () => {
  it('answers 401 without a token', async () => {
    const res = await request(app).get('/api/orders/12');
    expect(res.status).toBe(401);
    expect(orderService.getOrderForUser).not.toHaveBeenCalled();
  });

  it.each(['abc', '0', '-3', '1.5'])('answers 400 for the id %s', async (id) => {
    const res = await request(app).get(`/api/orders/${id}`).set(bearer(4));
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid id');
    expect(orderService.getOrderForUser).not.toHaveBeenCalled();
  });

  it('answers 200 with { order } and gives the service a number id and the token user', async () => {
    const one = order(12, '2026-11-12T10:00:00.000Z');
    orderService.getOrderForUser.mockResolvedValue(one);
    const res = await request(app).get('/api/orders/12').set(bearer(4, 'SALES_MANAGER'));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ order: one });
    expect(orderService.getOrderForUser).toHaveBeenCalledWith(12, { id: 4, role: 'SALES_MANAGER' });
  });

  it("answers 403 for another customer's order", async () => {
    orderService.getOrderForUser.mockRejectedValue(forbidden());
    const res = await request(app).get('/api/orders/12').set(bearer(5));
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'You do not have permission to do this' });
  });

  it('answers 404 for an unknown order', async () => {
    orderService.getOrderForUser.mockRejectedValue(notFound('Order not found'));
    const res = await request(app).get('/api/orders/999').set(bearer(4));
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Order not found' });
  });
});
