import { describe, it, expect, afterAll } from 'vitest';
import knex from 'knex';
import { PRODUCT_COLUMNS, applyProductFilters, toProduct, toCategory } from '../../src/utils/productQuery.js';

// A knex instance that never connects: we only ask it for the SQL text with toSQL().
const qb = knex({ client: 'pg' });
afterAll(() => qb.destroy());

const baseQuery = () =>
  qb('products as p').join('categories as c', 'c.id', 'p.category_id').select(PRODUCT_COLUMNS);

// A row the way db/knex.js hands it to the service: camelCase keys, DECIMAL as a string.
const row = {
  id: 1,
  name: 'De’Longhi Dedica Style Espresso Machine',
  model: 'EC685.M',
  serialNumber: 'CRM-ES-0001',
  description: 'Slim pump espresso machine.',
  quantityInStock: 12,
  price: '12499.00',
  warrantyStatus: '2 years',
  distributor: 'De’Longhi Türkiye',
  imageCount: 4,
  popularity: 80,
  categoryId: 1,
  createdAt: '2026-11-05T10:00:00.000Z',
  updatedAt: '2026-11-05T10:00:00.000Z',
  categoryName: 'Espresso Machines',
  categorySlug: 'espresso-machines',
};

describe('toProduct', () => {
  it('builds the Product shape of handbook 8.1', () => {
    expect(toProduct(row)).toEqual({
      id: 1,
      name: row.name,
      model: 'EC685.M',
      serialNumber: 'CRM-ES-0001',
      description: 'Slim pump espresso machine.',
      quantityInStock: 12,
      price: 12499,
      warrantyStatus: '2 years',
      distributor: row.distributor,
      imageCount: 4,
      popularity: 80,
      categoryId: 1,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      inStock: true,
      category: { id: 1, name: 'Espresso Machines', slug: 'espresso-machines' },
    });
  });

  it('turns the DECIMAL price string into a number', () => {
    expect(toProduct({ ...row, price: '849.90' }).price).toBe(849.9);
  });

  it('sets inStock to false when the stock is 0', () => {
    const product = toProduct({ ...row, quantityInStock: 0 });
    expect(product.inStock).toBe(false);
    expect(product.quantityInStock).toBe(0);
  });

  it('never sends cost or isActive, even if the row has them', () => {
    const product = toProduct({ ...row, cost: '6000.00', isActive: true });
    expect(product).not.toHaveProperty('cost');
    expect(product).not.toHaveProperty('isActive');
  });
});

describe('toCategory', () => {
  it('builds the Category shape with productCount as a number', () => {
    const category = toCategory({
      id: 7,
      name: 'Coffee',
      slug: 'coffee',
      description: 'Beans and ground coffee.',
      productCount: '6',
    });
    expect(category).toEqual({
      id: 7,
      name: 'Coffee',
      slug: 'coffee',
      description: 'Beans and ground coffee.',
      productCount: 6,
    });
  });

  it('uses null for a missing description', () => {
    expect(toCategory({ id: 1, name: 'A', slug: 'a', productCount: '0' }).description).toBeNull();
  });
});

describe('PRODUCT_COLUMNS', () => {
  it('never selects cost or is_active', () => {
    expect(PRODUCT_COLUMNS).not.toContain('p.cost');
    expect(PRODUCT_COLUMNS).not.toContain('p.is_active');
  });
});

describe('applyProductFilters', () => {
  it('lists only active products, ordered by id', () => {
    const { sql, bindings } = applyProductFilters(baseQuery(), {}).toSQL();
    expect(sql).toContain('where "p"."is_active" = ?');
    expect(sql).toMatch(/order by "p"\."id" asc$/);
    expect(bindings).toEqual([true]);
  });

  it('filters by category slug when one is given', () => {
    const { sql, bindings } = applyProductFilters(baseQuery(), { category: 'coffee' }).toSQL();
    expect(sql).toContain('"c"."slug" = ?');
    expect(bindings).toEqual([true, 'coffee']);
  });

  it('does not filter by category when none is given', () => {
    const { sql } = applyProductFilters(baseQuery()).toSQL();
    expect(sql).not.toContain('slug" = ?');
  });
});
