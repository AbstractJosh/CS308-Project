import { describe, it, expect, afterAll } from 'vitest';
import knex from 'knex';
import { PRODUCT_COLUMNS, applyProductFilters } from '../../src/utils/productQuery.js';
import { productListQuerySchema } from '../../src/utils/validators.js';

const qb = knex({ client: 'pg' });
afterAll(() => qb.destroy());

const baseQuery = () =>
  qb('products as p').join('categories as c', 'c.id', 'p.category_id').select(PRODUCT_COLUMNS);

const orderOf = (filters) => applyProductFilters(baseQuery(), filters).toSQL().sql.split('order by ')[1];

describe('applyProductFilters with sort', () => {
  it('sorts by price from low to high, then by id', () => {
    expect(orderOf({ sort: 'price_asc' })).toBe('"p"."price" asc, "p"."id" asc');
  });

  it('sorts by price from high to low, then by id', () => {
    expect(orderOf({ sort: 'price_desc' })).toBe('"p"."price" desc, "p"."id" asc');
  });

  it('puts the most popular products first', () => {
    expect(orderOf({ sort: 'popularity' })).toBe('"p"."popularity" desc, "p"."id" asc');
  });

  it('puts the newest products first', () => {
    expect(orderOf({ sort: 'newest' })).toBe('"p"."created_at" desc, "p"."id" asc');
  });

  it('keeps the id order when no sort is given', () => {
    expect(orderOf({})).toBe('"p"."id" asc');
  });

  it('sorts together with category and search', () => {
    const { sql, bindings } = applyProductFilters(baseQuery(), {
      category: 'grinders',
      q: 'burr',
      sort: 'price_asc',
    }).toSQL();
    expect(sql).toContain('"c"."slug" = ?');
    expect(sql).toContain('ilike');
    expect(sql).toMatch(/order by "p"\."price" asc, "p"\."id" asc$/);
    expect(bindings).toEqual([true, 'grinders', '%burr%', '%burr%']);
  });
});

describe('productListQuerySchema sort', () => {
  it.each(['price_asc', 'price_desc', 'popularity', 'newest'])('accepts %s', (sort) => {
    expect(productListQuerySchema.parse({ sort })).toEqual({ sort });
  });

  it('refuses any other sort value', () => {
    const result = productListQuerySchema.safeParse({ sort: 'cheapest' });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('Sort must be price_asc, price_desc, popularity or newest');
  });
});
