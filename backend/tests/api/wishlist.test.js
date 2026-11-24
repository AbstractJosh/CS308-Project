import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { signToken } from '../../src/utils/jwt.js';
import * as wishlistService from '../../src/services/wishlist.service.js';
import { notFound } from '../../src/utils/httpError.js';

// SCRUM-80 (Ulukan): the service is mocked, so these tests check only the routes: paths,
// the login and role checks, validation, status codes and the { products } shape.
vi.mock('../../src/services/wishlist.service.js', () => ({
  getWishlist: vi.fn(),
  addProduct: vi.fn(),
  removeProduct: vi.fn(),
}));

const auth = { Authorization: `Bearer ${signToken({ id: 7, role: 'CUSTOMER' })}` };
const products = [{ id: 3, name: 'Sage The Barista Express Impress', price: 99999, inStock: true }];

beforeEach(() => {
  vi.resetAllMocks();
});

const routes = [
  ['get', '/api/wishlist'],
  ['post', '/api/wishlist'],
  ['delete', '/api/wishlist/3'],
];

describe('wishlist routes are for customers only', () => {
  it.each(routes)('%s %s answers 401 without a token', async (method, path) => {
    const res = await request(app)[method](path).send({ productId: 3 });
    expect(res.status).toBe(401);
  });

  it.each(routes)('%s %s answers 403 for staff', async (method, path) => {
    const staff = { Authorization: `Bearer ${signToken({ id: 2, role: 'SALES_MANAGER' })}` };
    const res = await request(app)[method](path).set(staff).send({ productId: 3 });
    expect(res.status).toBe(403);
    expect(Object.values(wishlistService).every((fn) => fn.mock.calls.length === 0)).toBe(true);
  });
});

describe('GET /api/wishlist', () => {
  it('answers 200 with the products of the logged-in user', async () => {
    wishlistService.getWishlist.mockResolvedValue(products);
    const res = await request(app).get('/api/wishlist').set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ products });
    expect(wishlistService.getWishlist).toHaveBeenCalledWith(7);
  });
});

describe('POST /api/wishlist', () => {
  it('adds the product and answers 200 with the whole wishlist', async () => {
    wishlistService.addProduct.mockResolvedValue(products);
    const res = await request(app).post('/api/wishlist').set(auth).send({ productId: 3 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ products });
    expect(wishlistService.addProduct).toHaveBeenCalledWith(7, 3);
  });

  it.each([[{}], [{ productId: 'abc' }], [{ productId: 0 }], [{ productId: 1.5 }]])(
    'answers 400 for %j',
    async (body) => {
      const res = await request(app).post('/api/wishlist').set(auth).send(body);
      expect(res.status).toBe(400);
      expect(res.body.details[0].field).toBe('productId');
      expect(wishlistService.addProduct).not.toHaveBeenCalled();
    },
  );

  it('passes the 404 of a missing or removed product through', async () => {
    wishlistService.addProduct.mockRejectedValue(notFound('Product not found'));
    const res = await request(app).post('/api/wishlist').set(auth).send({ productId: 999 });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Product not found' });
  });
});

describe('DELETE /api/wishlist/:productId', () => {
  it('removes the product and answers 200 with the whole wishlist', async () => {
    wishlistService.removeProduct.mockResolvedValue([]);
    const res = await request(app).delete('/api/wishlist/3').set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ products: [] });
    expect(wishlistService.removeProduct).toHaveBeenCalledWith(7, 3);
  });

  it('answers 400 for an id that is not a product id', async () => {
    const res = await request(app).delete('/api/wishlist/abc').set(auth);
    expect(res.status).toBe(400);
    expect(wishlistService.removeProduct).not.toHaveBeenCalled();
  });
});
