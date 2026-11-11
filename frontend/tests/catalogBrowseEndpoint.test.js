import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../src/api/client.js';
import { productsApi } from '../src/api/endpoints.js';

vi.mock('../src/api/client.js', () => ({ api: vi.fn() }));

beforeEach(() => {
  vi.resetAllMocks();
});

describe('productsApi.browse', () => {
  it('asks for all products when no filter is given', () => {
    productsApi.browse();
    expect(api).toHaveBeenCalledWith('/products', { auth: false });
  });

  it('sends the search term encoded in the address', () => {
    productsApi.browse({ q: 'moka & pot' });
    expect(api).toHaveBeenCalledWith('/products?q=moka+%26+pot', { auth: false });
  });

  it('sends the category and the search together and skips empty values', () => {
    productsApi.browse({ category: 'coffee', q: 'beans', sort: '' });
    expect(api).toHaveBeenCalledWith('/products?category=coffee&q=beans', { auth: false });
  });
});
