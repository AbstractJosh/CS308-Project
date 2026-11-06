import { describe, it, expect } from 'vitest';
import { safeRedirect, serverErrors, validateLogin, validateRegister } from '../src/utils/authForm.js';

const goodForm = {
  name: 'Demo Customer',
  email: 'customer@crema.com',
  password: 'Demo1234',
  taxId: '1234567890',
  homeAddress: 'Sabancı University, Orta Mahalle, Tuzla, İstanbul',
};

describe('validateLogin', () => {
  it('needs an email and a password', () => {
    expect(validateLogin({ email: '', password: '' })).toEqual({
      email: 'Email is required',
      password: 'Password is required',
    });
  });

  it('rejects a wrong email and accepts a good form', () => {
    expect(validateLogin({ email: 'not-an-email', password: 'x' })).toEqual({ email: 'Enter a valid email' });
    expect(validateLogin({ email: ' customer@crema.com ', password: 'x' })).toEqual({});
  });
});

describe('validateRegister (handbook 7.2)', () => {
  const errorsFor = (changes) => validateRegister({ ...goodForm, ...changes });

  it('accepts a good form', () => {
    expect(validateRegister(goodForm)).toEqual({});
  });

  it('checks the name length', () => {
    expect(errorsFor({ name: 'A' }).name).toBe('Name must be 2 to 100 characters');
    expect(errorsFor({ name: 'x'.repeat(101) }).name).toBe('Name must be 2 to 100 characters');
  });

  it('checks the password rules', () => {
    expect(errorsFor({ password: 'abc123' }).password).toBe('Password must be 8 to 72 characters');
    expect(errorsFor({ password: '12345678' }).password).toBe('Password must contain a letter');
    expect(errorsFor({ password: 'abcdefgh' }).password).toBe('Password must contain a number');
    // 40 × "ş" is 80 bytes, more than bcrypt's 72.
    expect(errorsFor({ password: `${'ş'.repeat(40)}1` }).password).toMatch(/count as 2/);
  });

  it('needs a 10 or 11 digit tax ID and a 10 to 300 character address', () => {
    expect(errorsFor({ taxId: '123456789' }).taxId).toBe('Tax ID must be 10 or 11 digits');
    expect(errorsFor({ taxId: '12345678901' }).taxId).toBeUndefined();
    expect(errorsFor({ homeAddress: 'Short' }).homeAddress).toBe('Home address must be 10 to 300 characters');
  });
});

describe('serverErrors', () => {
  it('puts validation details next to their fields', () => {
    const err = { status: 400, message: 'Enter a valid email', details: [{ field: 'email', message: 'Enter a valid email' }] };
    expect(serverErrors(err)).toEqual({ fields: { email: 'Enter a valid email' }, form: '' });
  });

  it('puts "email already exists" on the email field', () => {
    const err = { status: 409, message: 'An account with this email already exists' };
    expect(serverErrors(err).fields.email).toBe('An account with this email already exists');
  });

  it('shows other errors above the button', () => {
    expect(serverErrors({ status: 401, message: 'Email or password is incorrect' })).toEqual({
      fields: {},
      form: 'Email or password is incorrect',
    });
  });
});

describe('safeRedirect', () => {
  it('keeps paths inside the site', () => {
    expect(safeRedirect('/checkout')).toBe('/checkout');
    expect(safeRedirect('/orders/5?tab=items')).toBe('/orders/5?tab=items');
  });

  it('sends everything else to the home page', () => {
    for (const bad of [null, '', 'https://evil.example', '//evil.example', '/\\evil.example', '/login', '/register?redirect=/x']) {
      expect(safeRedirect(bad)).toBe('/');
    }
  });
});
