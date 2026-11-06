import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import * as productsService from '../../src/services/products.service.js';
import * as categoriesService from '../../src/services/categories.service.js';
import { notFound } from '../../src/utils/httpError.js';

// The services are mocked, so these tests check only the routes: paths, status codes,
// validation and the JSON shapes. No database is needed.
vi.mock('../../src/services/products.service.js', () => ({
  listProducts: vi.fn(),
  getProductById: vi.fn(),
}));
vi.mock('../../src/services/categories.service.js', () => ({
  listCategories: vi.fn(),
}));

const product = {
  id: 1,
  name: 'Dedica Style Espresso Machine',
  model: 'EC685.M',
  serialNumber: 'CRM-ES-0001',
  description: 'Slim pump espresso machine.',
  quantityInStock: 0,
  price: 12499,
  warrantyStatus: '2 years',
  distributor: 'Official distributor',
  imageCount: 4,
  popularity: 80,
  categoryId: 1,
  createdAt: '2026-11-05T10:00:00.000Z',
  updatedAt: '2026-11-05T10:00:00.000Z',
  inStock: false,
  category: { id: 1, name: 'Espresso Machines', slug: 'espresso-machines' },
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('GET /api/products', () => {
  it('answers 200 with { products }, out-of-stock products included', async () => {
    productsService.listProducts.mockResolvedValue([product]);
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ products: [product] });
    expect(productsService.listProducts).toHaveBeenCalledWith({});
  });

  it('passes the cleaned category slug to the service', async () => {
    productsService.listProducts.mockResolvedValue([]);
    const res = await request(app).get('/api/products?category=Espresso-Machines');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ products: [] });
    expect(productsService.listProducts).toHaveBeenCalledWith({ category: 'espresso-machines' });
  });

  it('answers 400 with error and details for a bad category', async () => {
    const res = await request(app).get('/api/products?category=bad%20slug!');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: 'Invalid category',
      details: [{ field: 'category', message: 'Invalid category' }],
    });
    expect(productsService.listProducts).not.toHaveBeenCalled();
  });

  it('answers 500 with a generic message when the service crashes', async () => {
    productsService.listProducts.mockRejectedValue(new Error('connection refused'));
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(500);
    expect(res.body.error).not.toMatch(/connection/);
  });
});

describe('GET /api/products/:id', () => {
  it('answers 200 with { product } and gives the service a number id', async () => {
    productsService.getProductById.mockResolvedValue(product);
    const res = await request(app).get('/api/products/1');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ product });
    expect(productsService.getProductById).toHaveBeenCalledWith(1);
  });

  it.each(['abc', '0', '-3'])('answers 400 for the id %s', async (id) => {
    const res = await request(app).get(`/api/products/${id}`);
    expect(res.status).toBe(400);
    expect(res.body.details[0].field).toBe('id');
    expect(productsService.getProductById).not.toHaveBeenCalled();
  });

  it('answers 404 when the product does not exist', async () => {
    productsService.getProductById.mockRejectedValue(notFound('Product not found'));
    const res = await request(app).get('/api/products/999');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Product not found' });
  });
});

describe('GET /api/categories', () => {
  it('answers 200 with { categories }', async () => {
    const categories = [
      { id: 1, name: 'Espresso Machines', slug: 'espresso-machines', description: null, productCount: 8 },
    ];
    categoriesService.listCategories.mockResolvedValue(categories);
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ categories });
  });
});
