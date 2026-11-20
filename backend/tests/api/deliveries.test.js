import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { signToken } from '../../src/utils/jwt.js';
import * as deliveryService from '../../src/services/delivery.service.js';

// SCRUM-57: GET /admin/deliveries (handbook 8.3, req 12). The service is mocked, so these tests
// check the route: login, the product manager role (req 17), the query check and the shape.
vi.mock('../../src/services/delivery.service.js', () => ({ listDeliveries: vi.fn() }));

const bearer = (role) => ({ Authorization: `Bearer ${signToken({ id: 2, role })}` });
const delivery = {
  id: 5,
  orderId: 3,
  customerId: 1,
  productId: 40,
  productName: 'Zassenhaus Manaos Hand Grinder',
  quantity: 2,
  totalPrice: 8398,
  deliveryAddress: 'Orta Mahalle, Universite Caddesi No: 27, Tuzla, Istanbul',
  completed: false,
  orderStatus: 'PROCESSING',
};

beforeEach(() => vi.resetAllMocks());

describe('GET /api/admin/deliveries', () => {
  it('answers 401 without a token', async () => {
    const res = await request(app).get('/api/admin/deliveries');
    expect(res.status).toBe(401);
    expect(deliveryService.listDeliveries).not.toHaveBeenCalled();
  });

  it.each(['CUSTOMER', 'SALES_MANAGER', 'SUPPORT_AGENT'])('answers 403 to a %s', async (role) => {
    const res = await request(app).get('/api/admin/deliveries').set(bearer(role));
    expect(res.status).toBe(403);
    expect(deliveryService.listDeliveries).not.toHaveBeenCalled();
  });

  it('gives the product manager every delivery in the handbook shape', async () => {
    deliveryService.listDeliveries.mockResolvedValue([delivery]);
    const res = await request(app).get('/api/admin/deliveries').set(bearer('PRODUCT_MANAGER'));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ deliveries: [delivery] });
    expect(deliveryService.listDeliveries).toHaveBeenCalledWith({ completed: undefined });
  });

  it.each([
    ['false', false],
    ['true', true],
  ])('passes completed=%s on as a boolean', async (text, value) => {
    deliveryService.listDeliveries.mockResolvedValue([]);
    const res = await request(app).get(`/api/admin/deliveries?completed=${text}`).set(bearer('PRODUCT_MANAGER'));
    expect(res.status).toBe(200);
    expect(deliveryService.listDeliveries).toHaveBeenCalledWith({ completed: value });
  });

  it('answers 400 for a completed value that is not true or false', async () => {
    const res = await request(app).get('/api/admin/deliveries?completed=yes').set(bearer('PRODUCT_MANAGER'));
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('completed must be true or false');
    expect(deliveryService.listDeliveries).not.toHaveBeenCalled();
  });
});
