import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { hashPassword, verifyPassword } from '../../src/utils/password.js';
import * as authService from '../../src/services/auth.service.js';

const NOW = new Date('2026-11-06T10:00:00Z');
const table = vi.hoisted(() => ({ users: [], nextInsertError: null }));

// A stand-in for the users table, because tests must not need a database. It copies what the
// service relies on: snake_case columns, a unique email (Postgres error 23505) and rows that
// come back with camelCase keys, as db/knex.js does.
vi.mock('../../src/db/knex.js', async () => {
  const { rowToCamel } = await import('../../src/utils/case.js');
  const insertableColumns = ['name', 'email', 'password_hash', 'tax_id', 'home_address', 'role'];
  return {
    default: () => ({
      where: (filter) => ({
        first: async () => {
          const [[column, value]] = Object.entries(filter);
          const row = table.users.find((user) => user[column] === value);
          return row && rowToCamel(row);
        },
      }),
      insert: (values) => ({
        returning: async () => {
          if (table.nextInsertError) throw table.nextInsertError;
          const unknown = Object.keys(values).find((column) => !insertableColumns.includes(column));
          if (unknown) throw new Error(`column "${unknown}" does not exist`);
          if (table.users.some((user) => user.email === values.email)) {
            throw Object.assign(new Error('duplicate key'), { code: '23505' });
          }
          const row = { id: table.users.length + 1, ...values, created_at: NOW, updated_at: NOW };
          table.users.push(row);
          return [rowToCamel(row)];
        },
      }),
    }),
  };
});

const form = {
  name: 'Demo Customer',
  email: 'customer@crema.com',
  password: 'Demo1234',
  taxId: '1234567890',
  homeAddress: 'Orta Mahalle, Tuzla, Istanbul',
};

const publicUser = {
  id: 1,
  name: 'Demo Customer',
  email: 'customer@crema.com',
  taxId: '1234567890',
  homeAddress: 'Orta Mahalle, Tuzla, Istanbul',
  role: 'CUSTOMER',
  createdAt: NOW,
  updatedAt: NOW,
};

beforeEach(() => {
  table.users.length = 0;
  table.nextInsertError = null;
});

describe('register', () => {
  it('returns the public user, without the password hash', async () => {
    const { user } = await authService.register(form);
    expect(user).toEqual(publicUser);
  });

  it('returns a token with the new user id and role', async () => {
    const { token } = await authService.register(form);
    expect(jwt.verify(token, 'test-secret')).toMatchObject({ sub: 1, role: 'CUSTOMER' });
  });

  it('saves a hash that matches the password, never the password itself', async () => {
    await authService.register(form);
    const saved = table.users[0].password_hash;
    expect(saved).not.toBe('Demo1234');
    expect(await verifyPassword('Demo1234', saved)).toBe(true);
  });

  it('always creates a CUSTOMER, even if a role reaches the service', async () => {
    await authService.register({ ...form, role: 'SALES_MANAGER' });
    expect(table.users[0].role).toBe('CUSTOMER');
  });

  it('answers 409 for an email that already has an account', async () => {
    await authService.register(form);
    await expect(authService.register({ ...form, name: 'Someone Else' })).rejects.toMatchObject({
      status: 409,
      message: 'An account with this email already exists',
    });
    expect(table.users).toHaveLength(1);
  });

  it('does not report other database errors as a duplicate email', async () => {
    table.nextInsertError = Object.assign(new Error('connection lost'), { code: '08006' });
    await expect(authService.register(form)).rejects.toThrow('connection lost');
  });
});

describe('login', () => {
  beforeEach(async () => {
    table.users.push({
      id: 1,
      name: 'Demo Customer',
      email: 'customer@crema.com',
      password_hash: await hashPassword('Demo1234'),
      tax_id: '1234567890',
      home_address: 'Orta Mahalle, Tuzla, Istanbul',
      role: 'CUSTOMER',
      created_at: NOW,
      updated_at: NOW,
    });
  });

  it('returns the public user and a token for the right password', async () => {
    const { user, token } = await authService.login({ email: 'customer@crema.com', password: 'Demo1234' });
    expect(user).toEqual(publicUser);
    expect(jwt.verify(token, 'test-secret')).toMatchObject({ sub: 1, role: 'CUSTOMER' });
  });

  it.each([
    ['a wrong password', { email: 'customer@crema.com', password: 'Wrong1234' }],
    ['an unknown email', { email: 'nobody@crema.com', password: 'Demo1234' }],
  ])('answers the same 401 for %s', async (_label, credentials) => {
    await expect(authService.login(credentials)).rejects.toMatchObject({
      status: 401,
      message: 'Email or password is incorrect',
    });
  });

  it('logs in with a 72-byte password but answers the same 401 when extra text is added to it', async () => {
    const password = `A1${'ş'.repeat(35)}`;
    await authService.register({ ...form, email: 'long@crema.com', password });
    const { user } = await authService.login({ email: 'long@crema.com', password });
    expect(user.email).toBe('long@crema.com');
    await expect(authService.login({ email: 'long@crema.com', password: `${password}X` })).rejects.toMatchObject({
      status: 401,
      message: 'Email or password is incorrect',
    });
  });
});

describe('getMe', () => {
  it('returns the public user for an existing id', async () => {
    table.users.push({
      id: 1,
      name: 'Demo Customer',
      email: 'customer@crema.com',
      password_hash: 'stored-hash',
      tax_id: '1234567890',
      home_address: 'Orta Mahalle, Tuzla, Istanbul',
      role: 'CUSTOMER',
      created_at: NOW,
      updated_at: NOW,
    });
    expect(await authService.getMe(1)).toEqual(publicUser);
  });

  it('answers 404 when the user no longer exists', async () => {
    await expect(authService.getMe(99)).rejects.toMatchObject({ status: 404 });
  });
});
