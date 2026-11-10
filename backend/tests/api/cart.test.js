import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { signToken } from '../../src/utils/jwt.js';
import * as cartService from '../../src/services/cart.service.js';
import { badRequest, notFound } from '../../src/utils/httpError.js';

// The service is mocked, so these tests check only the routes: paths, the login check,
// validation, status codes and the { cart } shape. No database is needed.
vi.mock('../../src/services/cart.service.js', () => ({
  getCart: vi.fn(),
  addItem: vi.fn(),
  updateQuantity: vi.fn(),
  removeItem: vi.fn(),
  clearCart: vi.fn(),
  mergeCart: vi.fn(),
}));

const token = signToken({ id: 7, role: 'CUSTOMER' });
const auth = { Authorization: `Bearer ${token}` };

const cart = {
  items: [
    {
      productId: 3,
      quantity: 2,
      product: { id: 3, name: 'Sage The Barista Express Impress', price: 99999, quantityInStock: 9, inStock: true },
    },
  ],
  itemCount: 2,
  subtotal: 199998,
};
const emptyCart = { items: [], itemCount: 0, subtotal: 0 };

beforeEach(() => {
  vi.resetAllMocks();
});

describe('cart routes need login', () => {
  it.each([
    ['get', '/api/cart'],
    ['post', '/api/cart/items'],
    ['patch', '/api/cart/items/3'],
    ['delete', '/api/cart/items/3'],
    ['delete', '/api/cart'],
    ['post', '/api/cart/merge'],
  ])('%s %s answers 401 without a token', async (method, path) => {
    const res = await request(app)[method](path).send({});
    expect(res.status).toBe(401);
    expect(Object.values(cartService).every((fn) => fn.mock.calls.length === 0)).toBe(true);
  });
});

describe('GET /api/cart', () => {
  it('answers 200 with { cart } for the logged-in user', async () => {
    cartService.getCart.mockResolvedValue(cart);
    const res = await request(app).get('/api/cart').set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ cart });
    expect(cartService.getCart).toHaveBeenCalledWith(7);
  });
});

describe('POST /api/cart/items', () => {
  it('answers 200 with { cart } and passes the clean body to the service', async () => {
    cartService.addItem.mockResolvedValue(cart);
    const res = await request(app)
      .post('/api/cart/items')
      .set(auth)
      .send({ productId: 3, quantity: 2, extra: 'ignored' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ cart });
    expect(cartService.addItem).toHaveBeenCalledWith(7, { productId: 3, quantity: 2 });
  });

  it.each([
    [{ quantity: 1 }, 'productId'],
    [{ productId: 3 }, 'quantity'],
    [{ productId: 3, quantity: 0 }, 'quantity'],
    [{ productId: 3, quantity: 100 }, 'quantity'],
    [{ productId: 3, quantity: 1.5 }, 'quantity'],
    [{ productId: 'abc', quantity: 1 }, 'productId'],
  ])('answers 400 for %j', async (body, field) => {
    const res = await request(app).post('/api/cart/items').set(auth).send(body);
    expect(res.status).toBe(400);
    expect(res.body.details[0].field).toBe(field);
    expect(cartService.addItem).not.toHaveBeenCalled();
  });

  it('passes on the 400 for an out-of-stock product', async () => {
    cartService.addItem.mockRejectedValue(badRequest('This product is out of stock'));
    const res = await request(app).post('/api/cart/items').set(auth).send({ productId: 3, quantity: 1 });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'This product is out of stock' });
  });

  it('passes on the 404 for a missing product', async () => {
    cartService.addItem.mockRejectedValue(notFound('Product not found'));
    const res = await request(app).post('/api/cart/items').set(auth).send({ productId: 999, quantity: 1 });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Product not found' });
  });
});

describe('PATCH /api/cart/items/:productId', () => {
  it('answers 200 and gives the service a number product id', async () => {
    cartService.updateQuantity.mockResolvedValue(cart);
    const res = await request(app).patch('/api/cart/items/3').set(auth).send({ quantity: 2 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ cart });
    expect(cartService.updateQuantity).toHaveBeenCalledWith(7, 3, 2);
  });

  it('answers 400 for a bad product id or quantity', async () => {
    expect((await request(app).patch('/api/cart/items/abc').set(auth).send({ quantity: 1 })).status).toBe(400);
    expect((await request(app).patch('/api/cart/items/3').set(auth).send({ quantity: 0 })).status).toBe(400);
    expect(cartService.updateQuantity).not.toHaveBeenCalled();
  });

  it('passes on the 400 when the quantity is above the stock', async () => {
    cartService.updateQuantity.mockRejectedValue(badRequest('Only 5 in stock'));
    const res = await request(app).patch('/api/cart/items/3').set(auth).send({ quantity: 9 });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Only 5 in stock' });
  });
});

describe('DELETE /api/cart/items/:productId and DELETE /api/cart', () => {
  it('removes one product', async () => {
    cartService.removeItem.mockResolvedValue(emptyCart);
    const res = await request(app).delete('/api/cart/items/3').set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ cart: emptyCart });
    expect(cartService.removeItem).toHaveBeenCalledWith(7, 3);
  });

  it('empties the whole cart', async () => {
    cartService.clearCart.mockResolvedValue(emptyCart);
    const res = await request(app).delete('/api/cart').set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ cart: emptyCart });
    expect(cartService.clearCart).toHaveBeenCalledWith(7);
  });
});

describe('POST /api/cart/merge', () => {
  it('answers 200 with the merged { cart }', async () => {
    cartService.mergeCart.mockResolvedValue(cart);
    const items = [{ productId: 3, quantity: 2 }];
    const res = await request(app).post('/api/cart/merge').set(auth).send({ items });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ cart });
    expect(cartService.mergeCart).toHaveBeenCalledWith(7, items);
  });

  it('accepts an empty guest cart', async () => {
    cartService.mergeCart.mockResolvedValue(emptyCart);
    const res = await request(app).post('/api/cart/merge').set(auth).send({ items: [] });
    expect(res.status).toBe(200);
  });

  it('answers 400 without items or with more than 50', async () => {
    expect((await request(app).post('/api/cart/merge').set(auth).send({})).status).toBe(400);
    const tooMany = Array.from({ length: 51 }, (_, i) => ({ productId: i + 1, quantity: 1 }));
    const res = await request(app).post('/api/cart/merge').set(auth).send({ items: tooMany });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('A cart can have at most 50 items');
    expect(cartService.mergeCart).not.toHaveBeenCalled();
  });
});
