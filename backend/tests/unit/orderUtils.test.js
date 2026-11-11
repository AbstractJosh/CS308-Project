// Sprint 2 (Luis): the order rules of handbook 7.4, without a database (SCRUM-35).
import { describe, it, expect } from 'vitest';
import { HttpError } from '../../src/utils/httpError.js';
import {
  buildOrderLines,
  checkStock,
  orderTotal,
  roundMoney,
  toOrder,
  unitCostFor,
} from '../../src/utils/orderUtils.js';

// Runs fn and returns the HttpError it throws, so status and message can be checked together.
function errorOf(fn) {
  try {
    fn();
  } catch (err) {
    return err;
  }
  throw new Error('expected an error');
}

// Product rows as the service reads them: camelCase keys, DECIMAL columns as strings (pg).
const grinder = {
  id: 2,
  name: 'Baratza Encore',
  model: 'ESP',
  price: '7499.90',
  cost: '5000.00',
  quantityInStock: 5,
  isActive: true,
};
const beans = {
  id: 5,
  name: 'Ethiopia Yirgacheffe 250 g',
  model: 'ETH-250',
  price: '449.99',
  cost: null,
  quantityInStock: 40,
  isActive: true,
};
const removed = { ...beans, id: 9, name: 'Old Kettle', isActive: false };
const products = new Map([grinder, beans, removed].map((p) => [p.id, p]));

describe('roundMoney and unitCostFor', () => {
  it('rounds to cents', () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    expect(roundMoney('449.99')).toBe(449.99);
  });

  it('uses the cost when there is one', () => {
    expect(unitCostFor('7499.90', '5000.00')).toBe(5000);
  });

  it('uses 50% of the price when cost is null', () => {
    expect(unitCostFor('449.99', null)).toBe(225);
    expect(unitCostFor('100.00', undefined)).toBe(50);
  });
});

describe('buildOrderLines', () => {
  it('copies the current price and cost into each line', () => {
    const lines = buildOrderLines(
      [
        { productId: 2, quantity: 1 },
        { productId: 5, quantity: 3 },
      ],
      products,
    );
    expect(lines).toEqual([
      {
        productId: 2,
        name: 'Baratza Encore',
        model: 'ESP',
        quantity: 1,
        stock: 5,
        unitPrice: 7499.9,
        unitCost: 5000,
        lineTotal: 7499.9,
      },
      {
        productId: 5,
        name: 'Ethiopia Yirgacheffe 250 g',
        model: 'ETH-250',
        quantity: 3,
        stock: 40,
        unitPrice: 449.99,
        unitCost: 225,
        lineTotal: 1349.97,
      },
    ]);
  });

  it('leaves out removed and missing products, like the cart page', () => {
    const lines = buildOrderLines(
      [
        { productId: 9, quantity: 1 },
        { productId: 404, quantity: 1 },
        { productId: 5, quantity: 1 },
      ],
      products,
    );
    expect(lines.map((line) => line.productId)).toEqual([5]);
  });
});

describe('checkStock', () => {
  it('accepts lines that fit in the stock, including the last unit', () => {
    const lines = buildOrderLines([{ productId: 2, quantity: 5 }], products);
    expect(() => checkStock(lines)).not.toThrow();
  });

  it('refuses with 409 and one detail per short product', () => {
    const lines = buildOrderLines(
      [
        { productId: 2, quantity: 6 },
        { productId: 5, quantity: 1 },
        { productId: 5, quantity: 41 },
      ],
      products,
    );
    const err = errorOf(() => checkStock(lines));
    expect(err).toBeInstanceOf(HttpError);
    expect(err.status).toBe(409);
    expect(err.message).toBe('Baratza Encore has only 5 left');
    expect(err.details).toEqual([
      { field: 'productId', message: 'Baratza Encore has only 5 left' },
      { field: 'productId', message: 'Ethiopia Yirgacheffe 250 g has only 40 left' },
    ]);
  });

  it('refuses a product that sold out after it was put in the cart', () => {
    const soldOut = new Map([[2, { ...grinder, quantityInStock: 0 }]]);
    const err = errorOf(() => checkStock(buildOrderLines([{ productId: 2, quantity: 1 }], soldOut)));
    expect(err.status).toBe(409);
    expect(err.message).toBe('Baratza Encore has only 0 left');
  });
});

describe('orderTotal', () => {
  it('adds the line totals and rounds to cents', () => {
    const lines = buildOrderLines(
      [
        { productId: 2, quantity: 1 },
        { productId: 5, quantity: 3 },
      ],
      products,
    );
    expect(orderTotal(lines)).toBe(8849.87);
  });

  it('is 0 for no lines', () => {
    expect(orderTotal([])).toBe(0);
  });
});

describe('toOrder', () => {
  it('builds the Order object of handbook 8.1 with numbers, not strings', () => {
    const createdAt = new Date('2026-11-11T10:00:00Z');
    const order = toOrder(
      {
        id: 12,
        status: 'PROCESSING',
        total: '8849.87',
        deliveryAddress: 'Orta Mahalle, Tuzla, Istanbul',
        cardLast4: '4242',
        createdAt,
        deliveredAt: null,
      },
      [{ id: 30, productId: 2, name: 'Baratza Encore', model: 'ESP', quantity: 1, unitPrice: '7499.90' }],
    );
    expect(order).toEqual({
      id: 12,
      status: 'PROCESSING',
      total: 8849.87,
      deliveryAddress: 'Orta Mahalle, Tuzla, Istanbul',
      cardLast4: '4242',
      createdAt,
      deliveredAt: null,
      items: [{ id: 30, productId: 2, name: 'Baratza Encore', model: 'ESP', quantity: 1, unitPrice: 7499.9 }],
    });
  });
});
