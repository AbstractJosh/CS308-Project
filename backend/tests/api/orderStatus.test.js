import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { signToken } from '../../src/utils/jwt.js';
import { badRequest, notFound } from '../../src/utils/httpError.js';
import * as deliveryService from '../../src/services/delivery.service.js';

// SCRUM-60: PATCH /admin/orders/:id/status (handbook 8.3, req 12). The service is mocked, so
// these tests check the route: login, the product manager role (req 17), the id and body checks.
vi.mock('../../src/services/delivery.service.js', () => ({ updateOrderStatus: vi.fn() }));

const bearer = (role) => ({ Authorization: `Bearer ${signToken({ id: 2, role })}` });
const order = {
  id: 3,
  status: 'IN_TRANSIT',
  total: 8398,
  deliveryAddress: 'Orta Mahalle, Tuzla, Istanbul',
  cardLast4: '4242',
  createdAt: '2026-11-12T10:00:00.000Z',
  deliveredAt: null,
  items: [{ id: 5, productId: 40, name: 'Zassenhaus Manaos Hand Grinder', model: '040', quantity: 2, unitPrice: 4199 }],
};
const patch = (id, body, role = 'PRODUCT_MANAGER') =>
  request(app).patch(`/api/admin/orders/${id}/status`).set(bearer(role)).send(body);

beforeEach(() => vi.resetAllMocks());

describe('PATCH /api/admin/orders/:id/status', () => {
  it('answers 401 without a token', async () => {
    const res = await request(app).patch('/api/admin/orders/3/status').send({ status: 'IN_TRANSIT' });
    expect(res.status).toBe(401);
    expect(deliveryService.updateOrderStatus).not.toHaveBeenCalled();
  });

  it.each(['CUSTOMER', 'SALES_MANAGER', 'SUPPORT_AGENT'])('answers 403 to a %s', async (role) => {
    const res = await patch(3, { status: 'IN_TRANSIT' }, role);
    expect(res.status).toBe(403);
    expect(deliveryService.updateOrderStatus).not.toHaveBeenCalled();
  });

  it('moves the order and answers 200 with { order }', async () => {
    deliveryService.updateOrderStatus.mockResolvedValue(order);
    const res = await patch(3, { status: 'IN_TRANSIT' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ order });
    expect(deliveryService.updateOrderStatus).toHaveBeenCalledWith(3, 'IN_TRANSIT');
  });

  it.each([[{}], [{ status: 'PROCESSING' }], [{ status: 'CANCELLED' }], [{ status: 'delivered' }]])(
    'answers 400 for the body %j without calling the service',
    async (body) => {
      const res = await patch(3, body);
      expect(res.status).toBe(400);
      expect(res.body.details).toEqual([{ field: 'status', message: 'Status must be IN_TRANSIT or DELIVERED' }]);
      expect(deliveryService.updateOrderStatus).not.toHaveBeenCalled();
    },
  );

  it('answers 400 for a bad id', async () => {
    const res = await patch('abc', { status: 'IN_TRANSIT' });
    expect(res.status).toBe(400);
    expect(deliveryService.updateOrderStatus).not.toHaveBeenCalled();
  });

  it('passes the service errors on: 404 unknown order, 400 bad move', async () => {
    deliveryService.updateOrderStatus.mockRejectedValueOnce(notFound('Order not found'));
    expect((await patch(99, { status: 'IN_TRANSIT' })).body).toEqual({ error: 'Order not found' });

    const move = 'This order is PROCESSING, so it can only be moved to IN_TRANSIT, not DELIVERED';
    deliveryService.updateOrderStatus.mockRejectedValueOnce(badRequest(move));
    const res = await patch(3, { status: 'DELIVERED' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe(move);
  });
});
