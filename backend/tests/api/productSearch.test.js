import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import * as productsService from '../../src/services/products.service.js';

vi.mock('../../src/services/products.service.js', () => ({
  listProducts: vi.fn(),
  getProductById: vi.fn(),
}));

const soldOut = {
  id: 7,
  name: 'Sage The Oracle Dual Boiler',
  quantityInStock: 0,
  inStock: false,
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('GET /api/products?q=', () => {
  it('passes the trimmed search term to the service', async () => {
    productsService.listProducts.mockResolvedValue([]);
    const res = await request(app).get('/api/products?q=%20%20oracle%20');
    expect(res.status).toBe(200);
    expect(productsService.listProducts).toHaveBeenCalledWith({ q: 'oracle' });
  });

  it('returns out-of-stock products in the results', async () => {
    productsService.listProducts.mockResolvedValue([soldOut]);
    const res = await request(app).get('/api/products?q=oracle');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ products: [soldOut] });
  });

  it('searches inside a category when both are given', async () => {
    productsService.listProducts.mockResolvedValue([]);
    await request(app).get('/api/products?category=coffee&q=beans');
    expect(productsService.listProducts).toHaveBeenCalledWith({ category: 'coffee', q: 'beans' });
  });

  it('answers 400 with details for a search that is too long', async () => {
    const res = await request(app).get(`/api/products?q=${'a'.repeat(101)}`);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: 'Search must be at most 100 characters',
      details: [{ field: 'q', message: 'Search must be at most 100 characters' }],
    });
    expect(productsService.listProducts).not.toHaveBeenCalled();
  });
});
