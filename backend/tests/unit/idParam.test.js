import { describe, it, expect } from 'vitest';
import { idParamSchema } from '../../src/utils/validators.js';

describe('idParamSchema', () => {
  it('accepts a normal id and turns it into a number', () => {
    expect(idParamSchema.parse({ id: '5' })).toEqual({ id: 5 });
  });

  it.each(['abc', '1.5', '0', '-3', '99999999999'])('rejects %s with "Invalid id"', (id) => {
    const result = idParamSchema.safeParse({ id });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('Invalid id');
  });
});
