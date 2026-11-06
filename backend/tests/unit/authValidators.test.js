import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema } from '../../src/utils/validators.js';

const validForm = {
  name: 'Demo Customer',
  email: 'customer@crema.com',
  password: 'Demo1234',
  taxId: '1234567890',
  homeAddress: 'Orta Mahalle, Tuzla, Istanbul',
};

// Runs the schema with one field changed and returns the field names that failed.
function failedFields(changes) {
  const result = registerSchema.safeParse({ ...validForm, ...changes });
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
}

describe('registerSchema', () => {
  it('accepts a valid form', () => {
    expect(failedFields({})).toEqual([]);
  });

  it('trims and lowercases the email', () => {
    const parsed = registerSchema.parse({ ...validForm, email: '  Customer@CREMA.com ' });
    expect(parsed.email).toBe('customer@crema.com');
  });

  it('drops a role sent in the body, so nobody can register as staff', () => {
    const parsed = registerSchema.parse({ ...validForm, role: 'SALES_MANAGER' });
    expect(parsed).not.toHaveProperty('role');
  });

  it.each([
    ['name of 1 character', { name: 'A' }, 'name'],
    ['name of spaces only', { name: '     ' }, 'name'],
    ['name of 101 characters', { name: 'a'.repeat(101) }, 'name'],
    ['invalid email', { email: 'not-an-email' }, 'email'],
    ['email too long for the column', { email: `${'a'.repeat(250)}@crema.com` }, 'email'],
    ['password of 7 characters', { password: 'Demo123' }, 'password'],
    ['password of 73 characters', { password: `a1${'b'.repeat(71)}` }, 'password'],
    ['password without a letter', { password: '12345678' }, 'password'],
    ['password without a number', { password: 'DemoDemo' }, 'password'],
    ['tax ID of 9 digits', { taxId: '123456789' }, 'taxId'],
    ['tax ID of 12 digits', { taxId: '123456789012' }, 'taxId'],
    ['tax ID with a letter', { taxId: '123456789a' }, 'taxId'],
    ['address of 9 characters', { homeAddress: 'a'.repeat(9) }, 'homeAddress'],
    ['address of spaces only', { homeAddress: ' '.repeat(20) }, 'homeAddress'],
    ['address of 301 characters', { homeAddress: 'a'.repeat(301) }, 'homeAddress'],
  ])('rejects a %s', (_label, changes, field) => {
    expect(failedFields(changes)).toEqual([field]);
  });

  it.each([
    ['name of 2 characters', { name: 'Al' }],
    ['name of 100 characters', { name: 'a'.repeat(100) }],
    ['password of 8 characters', { password: 'Demo1234' }],
    ['password of 72 characters', { password: `a1${'b'.repeat(70)}` }],
    ['password whose only letter is Turkish', { password: '1234567ş' }],
    ['tax ID of 11 digits', { taxId: '12345678901' }],
    ['address of 10 characters', { homeAddress: 'a'.repeat(10) }],
    ['address of 300 characters', { homeAddress: 'a'.repeat(300) }],
  ])('accepts a %s', (_label, changes) => {
    expect(failedFields(changes)).toEqual([]);
  });

  it('gives a readable message for a missing field', () => {
    const { error } = registerSchema.safeParse({ ...validForm, name: undefined });
    expect(error.issues[0].message).toBe('Name is required');
  });
});

describe('loginSchema', () => {
  it('trims and lowercases the email, and leaves the password as typed', () => {
    const parsed = loginSchema.parse({ email: ' Customer@CREMA.com ', password: ' Demo1234 ' });
    expect(parsed).toEqual({ email: 'customer@crema.com', password: ' Demo1234 ' });
  });

  it('does not apply the register password rules, so a short password gets a 401 and not a 400', () => {
    expect(loginSchema.safeParse({ email: 'a@crema.com', password: 'x' }).success).toBe(true);
  });

  it.each([
    ['missing email', { password: 'Demo1234' }],
    ['invalid email', { email: 'nope', password: 'Demo1234' }],
    ['missing password', { email: 'a@crema.com' }],
    ['empty password', { email: 'a@crema.com', password: '' }],
  ])('rejects a %s', (_label, body) => {
    expect(loginSchema.safeParse(body).success).toBe(false);
  });
});
