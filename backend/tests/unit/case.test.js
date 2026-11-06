import { describe, it, expect } from 'vitest';
import { snakeToCamel, rowToCamel } from '../../src/utils/case.js';

describe('snakeToCamel', () => {
  it('converts snake_case column names', () => {
    expect(snakeToCamel('quantity_in_stock')).toBe('quantityInStock');
    expect(snakeToCamel('price')).toBe('price');
  });
});

describe('rowToCamel', () => {
  it('converts the keys of a row and keeps the values', () => {
    const created = new Date('2026-11-05T10:00:00Z');
    expect(rowToCamel({ serial_number: 'CRM-EM-1001', created_at: created })).toEqual({
      serialNumber: 'CRM-EM-1001',
      createdAt: created,
    });
  });

  it('leaves non-row values unchanged', () => {
    expect(rowToCamel(null)).toBeNull();
    expect(rowToCamel(5)).toBe(5);
  });
});
