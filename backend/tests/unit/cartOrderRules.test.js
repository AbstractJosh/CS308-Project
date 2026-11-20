// Sprint 2 (Luis, SCRUM-36): the cart and order rules of handbook 7.3 and 7.4 as whole scenarios:
// the stock cap, the login merge and the last item in stock. No database: the same pure helpers
// the cart and order services call, fed the rows those services would read.
import { describe, it, expect } from 'vitest';
import { checkSetQuantity, mergeLines, quantityAfterAdd } from '../../src/utils/cartUtils.js';
import { buildOrderLines, checkStock, orderTotal } from '../../src/utils/orderUtils.js';

// Runs fn and returns the HttpError it throws, so status and message can be checked together.
function errorOf(fn) {
  try {
    fn();
  } catch (err) {
    return err;
  }
  throw new Error('expected an error');
}

// Product rows as the services read them (camelCase keys, DECIMAL as strings from pg).
const product = (id, name, price, quantityInStock, isActive = true) => ({
  id,
  name,
  model: `M-${id}`,
  price,
  cost: null,
  quantityInStock,
  isActive,
});
const lastGrinder = product(2, 'Baratza Encore', '7499.90', 1); // the last one in stock
const beans = product(5, 'Ethiopia Yirgacheffe 250 g', '449.99', 3);
const kettle = product(7, 'Fellow Stagg Kettle', '5299.00', 500);
const catalog = (...rows) => new Map(rows.map((row) => [row.id, row]));

describe('stock cap when adding to the cart', () => {
  it('adds until the stock, then refuses with "Only N in stock"', () => {
    let quantity = quantityAfterAdd(0, 2, beans.quantityInStock); // 2 of 3
    expect(quantity).toBe(2);
    quantity = quantityAfterAdd(quantity, 5, beans.quantityInStock); // capped at 3, not 7
    expect(quantity).toBe(3);

    const err = errorOf(() => quantityAfterAdd(quantity, 1, beans.quantityInStock));
    expect(err.status).toBe(400);
    expect(err.message).toBe('Only 3 in stock');
  });

  it('lets the quantity be set to the stock but not one above it', () => {
    expect(() => checkSetQuantity(3, beans.quantityInStock)).not.toThrow();
    const err = errorOf(() => checkSetQuantity(4, beans.quantityInStock));
    expect(err.status).toBe(400);
    expect(err.message).toBe('Only 3 in stock');
  });
});

describe('the last item in stock', () => {
  it('can go in the cart once; a second add is refused', () => {
    expect(quantityAfterAdd(0, 3, lastGrinder.quantityInStock)).toBe(1);
    const err = errorOf(() => quantityAfterAdd(1, 1, lastGrinder.quantityInStock));
    expect(err.status).toBe(400);
    expect(err.message).toBe('Only 1 in stock');
  });

  it('can be ordered, and the order total is its price', () => {
    const lines = buildOrderLines([{ productId: 2, quantity: 1 }], catalog(lastGrinder));
    expect(() => checkStock(lines)).not.toThrow();
    expect(orderTotal(lines)).toBe(7499.9);
  });

  it('is refused at checkout with 409 when someone else bought it first, and only that line is named', () => {
    const soldOut = { ...lastGrinder, quantityInStock: 0 };
    const lines = buildOrderLines(
      [
        { productId: 2, quantity: 1 },
        { productId: 5, quantity: 3 },
      ],
      catalog(soldOut, beans),
    );
    const err = errorOf(() => checkStock(lines));
    expect(err.status).toBe(409);
    expect(err.message).toBe('Baratza Encore has only 0 left');
    expect(err.details).toEqual([{ field: 'productId', message: 'Baratza Encore has only 0 left' }]);
  });

  it('can no longer be added once it is sold out', () => {
    const err = errorOf(() => quantityAfterAdd(0, 1, 0));
    expect(err.status).toBe(400);
    expect(err.message).toBe('This product is out of stock');
  });
});

describe('merging the guest cart at login', () => {
  it('keeps the saved last item when the guest cart has it too (nothing to write)', () => {
    const saved = new Map([[2, 1]]);
    expect(mergeLines(saved, [{ productId: 2, quantity: 1 }], catalog(lastGrinder))).toEqual([]);
  });

  it('caps a guest quantity at the last item when nothing was saved', () => {
    expect(mergeLines(new Map(), [{ productId: 2, quantity: 4 }], catalog(lastGrinder))).toEqual([
      { productId: 2, quantity: 1 },
    ]);
  });

  it('adds saved and guest quantities but never above 99, even with more stock', () => {
    const saved = new Map([[7, 50]]);
    expect(mergeLines(saved, [{ productId: 7, quantity: 60 }], catalog(kettle))).toEqual([
      { productId: 7, quantity: 99 },
    ]);
  });

  it('drops a last item that sold out while the guest was browsing, and keeps the rest', () => {
    const soldOut = { ...lastGrinder, quantityInStock: 0 };
    const lines = mergeLines(
      new Map(),
      [
        { productId: 2, quantity: 1 },
        { productId: 5, quantity: 2 },
      ],
      catalog(soldOut, beans),
    );
    expect(lines).toEqual([{ productId: 5, quantity: 2 }]);
  });

  it('gives a cart that passes the checkout stock check right away', () => {
    const products = catalog(lastGrinder, beans, kettle);
    const saved = new Map([[5, 2]]);
    const merged = mergeLines(
      saved,
      [
        { productId: 2, quantity: 2 },
        { productId: 5, quantity: 2 },
        { productId: 7, quantity: 1 },
      ],
      products,
    );
    expect(merged).toEqual([
      { productId: 2, quantity: 1 },
      { productId: 5, quantity: 3 },
      { productId: 7, quantity: 1 },
    ]);

    const lines = buildOrderLines(merged, products);
    expect(() => checkStock(lines)).not.toThrow();
    expect(orderTotal(lines)).toBe(14148.87); // 7499.90 + 3 x 449.99 + 5299.00
  });
});

describe('removed products', () => {
  it('are left out of the order and its total, like the cart page hides them', () => {
    const removedKettle = { ...kettle, isActive: false };
    const lines = buildOrderLines(
      [
        { productId: 7, quantity: 1 },
        { productId: 5, quantity: 1 },
      ],
      catalog(removedKettle, beans),
    );
    expect(lines.map((line) => line.productId)).toEqual([5]);
    expect(orderTotal(lines)).toBe(449.99);
  });
});
