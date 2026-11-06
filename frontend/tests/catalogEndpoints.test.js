import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../src/api/client.js';
import { productsApi, categoriesApi } from '../src/api/endpoints.js';

// api() is mocked: we only check which path each call uses. Catalog calls never need login.
vi.mock('../src/api/client.js', () => ({ api: vi.fn() }));

beforeEach(() => {
  vi.resetAllMocks();
});

describe('productsApi and categoriesApi (SCRUM-13)', () => {
  it('lists all products without a category', () => {
    productsApi.list();
    expect(api).toHaveBeenCalledWith('/products', { auth: false });
  });

  it('lists the products of one category', () => {
    productsApi.list('french-press-moka');
    expect(api).toHaveBeenCalledWith('/products?category=french-press-moka', { auth: false });
  });

  it('gets one product by id', () => {
    productsApi.get(12);
    expect(api).toHaveBeenCalledWith('/products/12', { auth: false });
  });

  it('lists the categories', () => {
    categoriesApi.list();
    expect(api).toHaveBeenCalledWith('/categories', { auth: false });
  });
});
