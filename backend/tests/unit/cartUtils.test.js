// Sprint 2 (Luis): the cart rules of handbook 7.3, without a database.
import { describe, it, expect } from 'vitest';
import { HttpError } from '../../src/utils/httpError.js';
import {
  MAX_QUANTITY,
  buildCart,
  checkSetQuantity,
  mergeLines,
  quantityAfterAdd,
} from '../../src/utils/cartUtils.js';

// Runs fn and returns the HttpError it throws, so status and message can be checked together.
function errorOf(fn) {
  try {
    fn();
  } catch (err) {
    return err;
  }
  throw new Error('expected an error');
}

describe('quantityAfterAdd', () => {
  it('adds to what is already in the cart', () => {
    expect(quantityAfterAdd(0, 2, 10)).toBe(2);
    expect(quantityAfterAdd(3, 2, 10)).toBe(5);
  });

  it('caps the new quantity at the stock', () => {
    expect(quantityAfterAdd(4, 5, 6)).toBe(6);
  });

  it('refuses an out-of-stock product with 400', () => {
    const err = errorOf(() => quantityAfterAdd(0, 1, 0));
    expect(err).toBeInstanceOf(HttpError);
    expect(err.status).toBe(400);
    expect(err.message).toBe('This product is out of stock');
  });

  it('refuses with "Only N in stock" when the cart already holds all the stock', () => {
    const err = errorOf(() => quantityAfterAdd(3, 1, 3));
    expect(err.status).toBe(400);
    expect(err.message).toBe('Only 3 in stock');
  });

  it('never goes above 99, even with more stock', () => {
    expect(quantityAfterAdd(95, 10, 500)).toBe(MAX_QUANTITY);
    const err = errorOf(() => quantityAfterAdd(99, 1, 500));
    expect(err.status).toBe(400);
    expect(err.message).toBe('You can have at most 99 of one product');
  });
});

describe('checkSetQuantity', () => {
  it('accepts a quantity up to the stock', () => {
    expect(() => checkSetQuantity(5, 5)).not.toThrow();
  });

  it('refuses a quantity above the stock with 400', () => {
    const err = errorOf(() => checkSetQuantity(6, 5));
    expect(err.status).toBe(400);
    expect(err.message).toBe('Only 5 in stock');
  });

  it('refuses any quantity when the product is out of stock', () => {
    expect(errorOf(() => checkSetQuantity(1, 0)).message).toBe('This product is out of stock');
  });
});

describe('mergeLines', () => {
  const products = new Map([
    [1, { id: 1, quantityInStock: 10, isActive: true }],
    [2, { id: 2, quantityInStock: 3, isActive: true }],
    [3, { id: 3, quantityInStock: 0, isActive: true }],
    [4, { id: 4, quantityInStock: 8, isActive: false }],
  ]);

  it('adds guest quantities to the saved ones, capped at stock', () => {
    const existing = new Map([
      [1, 2],
      [2, 2],
    ]);
    const lines = mergeLines(
      existing,
      [
        { productId: 1, quantity: 3 },
        { productId: 2, quantity: 5 },
      ],
      products,
    );
    expect(lines).toEqual([
      { productId: 1, quantity: 5 },
      { productId: 2, quantity: 3 },
    ]);
  });

  it('drops products that are gone, removed or out of stock', () => {
    const lines = mergeLines(
      new Map(),
      [
        { productId: 3, quantity: 1 },
        { productId: 4, quantity: 1 },
        { productId: 99, quantity: 1 },
        { productId: 1, quantity: 1 },
      ],
      products,
    );
    expect(lines).toEqual([{ productId: 1, quantity: 1 }]);
  });

  it('adds up the same product sent twice', () => {
    const lines = mergeLines(
      new Map(),
      [
        { productId: 1, quantity: 4 },
        { productId: 1, quantity: 4 },
      ],
      products,
    );
    expect(lines).toEqual([{ productId: 1, quantity: 8 }]);
  });

  it('writes nothing for a line that is already at the stock', () => {
    expect(mergeLines(new Map([[2, 3]]), [{ productId: 2, quantity: 2 }], products)).toEqual([]);
  });
});

describe('buildCart', () => {
  const row = (id, price, cartQuantity) => ({
    id,
    name: `Product ${id}`,
    model: 'M',
    serialNumber: `CRM-${id}`,
    description: 'd',
    quantityInStock: 10,
    price: String(price), // pg returns DECIMAL as a string
    warrantyStatus: '2 years',
    distributor: 'D',
    imageCount: 1,
    popularity: 0,
    categoryId: 1,
    createdAt: 'x',
    updatedAt: 'x',
    categoryName: 'Coffee',
    categorySlug: 'coffee',
    cartQuantity,
  });

  it('builds { items, itemCount, subtotal } with Product objects', () => {
    const cart = buildCart([row(1, '10.10', 2), row(2, '0.20', 1)]);
    expect(cart.itemCount).toBe(3);
    expect(cart.subtotal).toBe(20.4);
    expect(cart.items[0]).toMatchObject({ productId: 1, quantity: 2 });
    expect(cart.items[0].product).toMatchObject({ id: 1, price: 10.1, inStock: true });
    expect(cart.items[0].product.category).toEqual({ id: 1, name: 'Coffee', slug: 'coffee' });
  });

  it('gives an empty cart for no rows', () => {
    expect(buildCart([])).toEqual({ items: [], itemCount: 0, subtotal: 0 });
  });
});
