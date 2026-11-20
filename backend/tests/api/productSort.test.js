import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import * as productsService from '../../src/services/products.service.js';

vi.mock('../../src/services/products.service.js', () => ({
  listProducts: vi.fn(),
  getProductById: vi.fn(),
}));

beforeEach(() => {
  vi.resetAllMocks();
});

describe('GET /api/products?sort=', () => {
  it('passes the sort to the service', async () => {
    productsService.listProducts.mockResolvedValue([]);
    const res = await request(app).get('/api/products?sort=popularity');
    expect(res.status).toBe(200);
    expect(productsService.listProducts).toHaveBeenCalledWith({ sort: 'popularity' });
  });

  it('passes sort, category and search together', async () => {
    productsService.listProducts.mockResolvedValue([]);
    await request(app).get('/api/products?category=coffee&q=beans&sort=price_desc');
    expect(productsService.listProducts).toHaveBeenCalledWith({ category: 'coffee', q: 'beans', sort: 'price_desc' });
  });

  it('answers 400 for a bad sort', async () => {
    const res = await request(app).get('/api/products?sort=cheapest');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: 'Sort must be price_asc, price_desc, popularity or newest',
      details: [{ field: 'sort', message: 'Sort must be price_asc, price_desc, popularity or newest' }],
    });
    expect(productsService.listProducts).not.toHaveBeenCalled();
  });
});
