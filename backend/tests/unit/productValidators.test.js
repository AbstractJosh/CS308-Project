import { describe, it, expect } from 'vitest';
import { productListQuerySchema, idParamSchema } from '../../src/utils/validators.js';

describe('productListQuerySchema', () => {
  it('accepts an empty query (all products)', () => {
    expect(productListQuerySchema.parse({})).toEqual({});
  });

  it('accepts a category slug and cleans it (trim, lowercase)', () => {
    expect(productListQuerySchema.parse({ category: '  Espresso-Machines ' })).toEqual({
      category: 'espresso-machines',
    });
  });

  it('refuses a slug with characters a slug never has', () => {
    const result = productListQuerySchema.safeParse({ category: "coffee'; drop table" });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('Invalid category');
  });

  it('refuses a slug longer than 80 characters', () => {
    expect(productListQuerySchema.safeParse({ category: 'a'.repeat(81) }).success).toBe(false);
  });
});

describe('idParamSchema for /products/:id', () => {
  it('turns "5" into the number 5', () => {
    expect(idParamSchema.parse({ id: '5' })).toEqual({ id: 5 });
  });

  it.each(['abc', '0', '-3', '1.5'])('refuses %s', (id) => {
    expect(idParamSchema.safeParse({ id }).success).toBe(false);
  });
});
