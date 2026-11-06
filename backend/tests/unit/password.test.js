import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/utils/password.js';

describe('hashPassword', () => {
  it('makes a bcrypt hash with 10 salt rounds that does not contain the password', async () => {
    const hash = await hashPassword('Demo1234');
    expect(hash).toMatch(/^\$2[aby]\$10\$/);
    expect(hash).not.toContain('Demo1234');
  });

  it('makes a different hash each time because of the random salt', async () => {
    expect(await hashPassword('Demo1234')).not.toBe(await hashPassword('Demo1234'));
  });
});

describe('verifyPassword', () => {
  it('accepts the right password and rejects a wrong one', async () => {
    const hash = await hashPassword('Demo1234');
    expect(await verifyPassword('Demo1234', hash)).toBe(true);
    expect(await verifyPassword('demo1234', hash)).toBe(false);
  });
});
