import { describe, it, expect, afterAll } from 'vitest';
import knex from 'knex';
import { PRODUCT_COLUMNS, applyProductFilters, escapeLike } from '../../src/utils/productQuery.js';
import { productListQuerySchema } from '../../src/utils/validators.js';

const qb = knex({ client: 'pg' });
afterAll(() => qb.destroy());

const baseQuery = () =>
  qb('products as p').join('categories as c', 'c.id', 'p.category_id').select(PRODUCT_COLUMNS);

describe('escapeLike', () => {
  it('leaves a normal search term as it is', () => {
    expect(escapeLike('espresso')).toBe('espresso');
  });

  it('escapes %, _ and \\ so they are searched as plain characters', () => {
    expect(escapeLike('100%')).toBe('100\\%');
    expect(escapeLike('KF_6')).toBe('KF\\_6');
    expect(escapeLike('a\\b')).toBe('a\\\\b');
  });
});

describe('applyProductFilters with q', () => {
  it('matches the name or the description with ILIKE', () => {
    const { sql, bindings } = applyProductFilters(baseQuery(), { q: 'grinder' }).toSQL();
    expect(sql).toContain('("p"."name" ilike ? or "p"."description" ilike ?)');
    expect(bindings).toEqual([true, '%grinder%', '%grinder%']);
  });

  it('works together with the category filter', () => {
    const { sql, bindings } = applyProductFilters(baseQuery(), { category: 'coffee', q: 'beans' }).toSQL();
    expect(sql).toContain('"c"."slug" = ?');
    expect(sql).toContain('ilike');
    expect(bindings).toEqual([true, 'coffee', '%beans%', '%beans%']);
  });

  it('sends the escaped term, so % finds only a real percent sign', () => {
    const { bindings } = applyProductFilters(baseQuery(), { q: '50%' }).toSQL();
    expect(bindings).toEqual([true, '%50\\%%', '%50\\%%']);
  });

  it('does not search when q is missing', () => {
    const { sql } = applyProductFilters(baseQuery(), {}).toSQL();
    expect(sql).not.toContain('ilike');
  });
});

describe('productListQuerySchema q', () => {
  it('trims the search term', () => {
    expect(productListQuerySchema.parse({ q: '  moka pot ' })).toEqual({ q: 'moka pot' });
  });

  it('drops an empty or blank search term', () => {
    expect(productListQuerySchema.parse({ q: '   ' }).q).toBeUndefined();
  });

  it('refuses a search longer than 100 characters', () => {
    const result = productListQuerySchema.safeParse({ q: 'a'.repeat(101) });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('Search must be at most 100 characters');
  });

  it('refuses q sent twice', () => {
    const result = productListQuerySchema.safeParse({ q: ['a', 'b'] });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('Invalid search');
  });
});
