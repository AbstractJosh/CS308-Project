import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { signToken } from '../../src/utils/jwt.js';
import { conflict, notFound } from '../../src/utils/httpError.js';
import * as adminCatalogService from '../../src/services/adminCatalog.service.js';
import * as invoiceService from '../../src/services/invoice.service.js';

// SCRUM-77 (Murat): the product manager's routes (docs/API.md, SCRUM-76; req 12, 17).
// The services are mocked, so these tests check the routes: login, the role, the body checks,
// the status codes and the JSON shape.
vi.mock('../../src/services/adminCatalog.service.js', () => ({
  listProducts: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  removeProduct: vi.fn(),
  setStock: vi.fn(),
  createCategory: vi.fn(),
  deleteCategory: vi.fn(),
}));
vi.mock('../../src/services/invoice.service.js', () => ({ listInvoices: vi.fn(), getInvoicePdf: vi.fn() }));

const bearer = (role) => ({ Authorization: `Bearer ${signToken({ id: 2, role })}` });
const PM = bearer('PRODUCT_MANAGER');

const body = {
  name: 'Bialetti Milk Frother Mini',
  model: 'MF-1',
  serialNumber: 'CRM-SV-9006',
  description: 'Small stovetop milk frother.',
  categoryId: 9,
  price: 1299.9,
  cost: 650,
  quantityInStock: 10,
  warrantyStatus: 'No warranty',
  distributor: 'Bialetti official distributor',
};
const product = { id: 52, ...body, imageCount: 1, popularity: 0, inStock: true };

beforeEach(() => vi.resetAllMocks());

describe('product manager role (req 17)', () => {
  const routes = [
    ['get', '/api/admin/products'],
    ['post', '/api/admin/products'],
    ['patch', '/api/admin/products/52'],
    ['delete', '/api/admin/products/52'],
    ['patch', '/api/admin/products/52/stock'],
    ['post', '/api/admin/categories'],
    ['delete', '/api/admin/categories/11'],
    ['get', '/api/admin/invoices'],
  ];

  it.each(routes)('%s %s answers 401 without a token', async (method, path) => {
    const res = await request(app)[method](path).send({});
    expect(res.status).toBe(401);
  });

  it.each(routes)('%s %s answers 403 to a customer', async (method, path) => {
    const res = await request(app)[method](path).set(bearer('CUSTOMER')).send(body);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'You do not have permission to do this' });
  });

  it.each(['SALES_MANAGER', 'SUPPORT_AGENT'])('answers 403 to a %s', async (role) => {
    const res = await request(app).get('/api/admin/products').set(bearer(role));
    expect(res.status).toBe(403);
    expect(adminCatalogService.listProducts).not.toHaveBeenCalled();
  });
});

describe('products', () => {
  it('GET lists the products with cost', async () => {
    adminCatalogService.listProducts.mockResolvedValue([product]);
    const res = await request(app).get('/api/admin/products').set(PM);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ products: [product] });
  });

  it('POST creates a product: 201 { product }, with the text trimmed', async () => {
    adminCatalogService.createProduct.mockResolvedValue(product);
    const res = await request(app)
      .post('/api/admin/products')
      .set(PM)
      .send({ ...body, name: '  Bialetti Milk Frother Mini  ' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ product });
    expect(adminCatalogService.createProduct).toHaveBeenCalledWith(body);
  });

  it('POST without cost saves cost as null', async () => {
    adminCatalogService.createProduct.mockResolvedValue(product);
    const { cost, ...withoutCost } = body;
    await request(app).post('/api/admin/products').set(PM).send(withoutCost);
    expect(adminCatalogService.createProduct).toHaveBeenCalledWith({ ...withoutCost, cost: null });
    expect(cost).toBe(650);
  });

  it.each([
    [{ price: -1 }, 'price', 'Price must be a number, 0 or more'],
    [{ price: '1299' }, 'price', 'Price must be a number, 0 or more'],
    [{ price: 12.505 }, 'price', 'Price can have at most 2 decimals'],
    [{ cost: -3 }, 'cost', 'Cost must be a number, 0 or more'],
    [{ quantityInStock: 1.5 }, 'quantityInStock', 'Stock must be a whole number, 0 or more'],
    [{ name: '   ' }, 'name', 'Name is required'],
    [{ model: 'x'.repeat(101) }, 'model', 'Model must be at most 100 characters'],
    [{ categoryId: undefined }, 'categoryId', 'Choose a category'],
  ])('POST with %j answers 400 for %s', async (change, field, message) => {
    const res = await request(app).post('/api/admin/products').set(PM).send({ ...body, ...change });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe(message);
    expect(res.body.details).toContainEqual({ field, message });
    expect(adminCatalogService.createProduct).not.toHaveBeenCalled();
  });

  it('POST answers 409 when the serial number is taken', async () => {
    adminCatalogService.createProduct.mockRejectedValue(conflict('A product with this serial number already exists'));
    const res = await request(app).post('/api/admin/products').set(PM).send(body);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('A product with this serial number already exists');
  });

  it('PATCH sends only the changed fields, and cost null clears the cost', async () => {
    adminCatalogService.updateProduct.mockResolvedValue({ ...product, price: 1199, cost: null });
    const res = await request(app).patch('/api/admin/products/52').set(PM).send({ price: 1199, cost: null });
    expect(res.status).toBe(200);
    expect(adminCatalogService.updateProduct).toHaveBeenCalledWith(52, { price: 1199, cost: null });
  });

  it('PATCH with an empty body answers 400', async () => {
    const res = await request(app).patch('/api/admin/products/52').set(PM).send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Send at least one field to change');
  });

  it('PATCH on a missing product answers 404', async () => {
    adminCatalogService.updateProduct.mockRejectedValue(notFound('Product not found'));
    const res = await request(app).patch('/api/admin/products/999').set(PM).send({ price: 1 });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Product not found' });
  });

  it('DELETE answers 204 with no body', async () => {
    adminCatalogService.removeProduct.mockResolvedValue();
    const res = await request(app).delete('/api/admin/products/52').set(PM);
    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    expect(adminCatalogService.removeProduct).toHaveBeenCalledWith(52);
  });

  it.each(['abc', '0', '-1'])('answers 400 for the id %s', async (id) => {
    const res = await request(app).delete(`/api/admin/products/${id}`).set(PM);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid id');
  });
});

describe('stock', () => {
  it('PATCH /stock writes the new number', async () => {
    adminCatalogService.setStock.mockResolvedValue({ ...product, quantityInStock: 0, inStock: false });
    const res = await request(app).patch('/api/admin/products/52/stock').set(PM).send({ quantityInStock: 0 });
    expect(res.status).toBe(200);
    expect(res.body.product.inStock).toBe(false);
    expect(adminCatalogService.setStock).toHaveBeenCalledWith(52, 0);
  });

  it.each([[-1], [2.5], ['5'], [undefined]])('PATCH /stock with %s answers 400', async (quantityInStock) => {
    const res = await request(app).patch('/api/admin/products/52/stock').set(PM).send({ quantityInStock });
    expect(res.status).toBe(400);
    expect(adminCatalogService.setStock).not.toHaveBeenCalled();
  });
});

describe('categories', () => {
  it('POST creates a category: 201 { category }', async () => {
    const category = { id: 11, name: 'Milk Frothers', slug: 'milk-frothers', description: null, productCount: 0 };
    adminCatalogService.createCategory.mockResolvedValue(category);
    const res = await request(app).post('/api/admin/categories').set(PM).send({ name: 'Milk Frothers' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ category });
    expect(adminCatalogService.createCategory).toHaveBeenCalledWith({ name: 'Milk Frothers', description: null });
  });

  it('POST with a bad slug answers 400', async () => {
    const res = await request(app).post('/api/admin/categories').set(PM).send({ name: 'X', slug: 'Bad Slug' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Slug can only have lowercase letters, digits and single dashes');
  });

  it('DELETE answers 204, or 409 while the category has products', async () => {
    adminCatalogService.deleteCategory.mockResolvedValueOnce();
    expect((await request(app).delete('/api/admin/categories/11').set(PM)).status).toBe(204);

    adminCatalogService.deleteCategory.mockRejectedValueOnce(conflict('This category still has products'));
    const res = await request(app).delete('/api/admin/categories/7').set(PM);
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'This category still has products' });
  });
});

describe('invoices', () => {
  it('GET /admin/invoices passes the dates to the service', async () => {
    invoiceService.listInvoices.mockResolvedValue([]);
    const res = await request(app).get('/api/admin/invoices?from=2026-11-01&to=2026-11-30').set(PM);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ invoices: [] });
    expect(invoiceService.listInvoices).toHaveBeenCalledWith({ from: '2026-11-01', to: '2026-11-30' });
  });

  it.each([
    ['?from=2026-02-30', 'from must be a real date'],
    ['?to=30.11.2026', 'to must be a date like 2026-11-30'],
    ['?from=2026-12-01&to=2026-11-01', 'from must not be after to'],
  ])('GET /admin/invoices%s answers 400', async (query, message) => {
    const res = await request(app).get(`/api/admin/invoices${query}`).set(PM);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe(message);
  });
});
