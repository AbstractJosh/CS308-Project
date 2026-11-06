import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/app.js';
import { env } from '../../src/config/env.js';
import * as authService from '../../src/services/auth.service.js';
import { conflict, notFound, unauthorized } from '../../src/utils/httpError.js';

// The service is mocked, so these tests check only the routes: paths, status codes,
// validation, the token check and the JSON shapes. No database is needed.
vi.mock('../../src/services/auth.service.js', () => ({
  register: vi.fn(),
  login: vi.fn(),
  getMe: vi.fn(),
}));

const user = {
  id: 7,
  name: 'Demo Customer',
  email: 'customer@crema.com',
  taxId: '1234567890',
  homeAddress: 'Orta Mahalle, Tuzla, Istanbul',
  role: 'CUSTOMER',
  createdAt: '2026-11-06T10:00:00.000Z',
  updatedAt: '2026-11-06T10:00:00.000Z',
};

const form = {
  name: 'Demo Customer',
  email: 'customer@crema.com',
  password: 'Demo1234',
  taxId: '1234567890',
  homeAddress: 'Orta Mahalle, Tuzla, Istanbul',
};

const validToken = () => jwt.sign({ sub: 7, role: 'CUSTOMER' }, 'test-secret');

beforeEach(() => {
  vi.resetAllMocks();
});

describe('POST /api/auth/register', () => {
  it('answers 201 with { user, token }', async () => {
    authService.register.mockResolvedValue({ user, token: 'new-token' });
    const res = await request(app).post('/api/auth/register').send(form);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ user, token: 'new-token' });
  });

  it('gives the service the cleaned form: email lowercased, role removed', async () => {
    authService.register.mockResolvedValue({ user, token: 'new-token' });
    await request(app)
      .post('/api/auth/register')
      .send({ ...form, email: ' Customer@CREMA.com ', role: 'SALES_MANAGER' });
    expect(authService.register).toHaveBeenCalledWith(form);
  });

  it('answers 400 with error and details for bad input, and never calls the service', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...form, taxId: '123' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: 'Tax ID must be 10 or 11 digits',
      details: [{ field: 'taxId', message: 'Tax ID must be 10 or 11 digits' }],
    });
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('answers 400 for a password over 72 bytes, and 201 for one of exactly 72 bytes', async () => {
    authService.register.mockResolvedValue({ user, token: 'new-token' });
    const longest = `A1${'ş'.repeat(35)}`; // 37 characters, 72 bytes
    const tooLong = await request(app)
      .post('/api/auth/register')
      .send({ ...form, password: `${longest}X` });
    expect(tooLong.status).toBe(400);
    expect(tooLong.body.details).toEqual([
      { field: 'password', message: 'Password is too long: letters like ş count as 2 of the 72 characters' },
    ]);
    expect(authService.register).not.toHaveBeenCalled();

    const fits = await request(app)
      .post('/api/auth/register')
      .send({ ...form, password: longest });
    expect(fits.status).toBe(201);
  });

  it('answers 409 when the email is taken', async () => {
    authService.register.mockRejectedValue(conflict('An account with this email already exists'));
    const res = await request(app).post('/api/auth/register').send(form);
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'An account with this email already exists' });
  });
});

describe('POST /api/auth/login', () => {
  it('answers 200 with { user, token }', async () => {
    authService.login.mockResolvedValue({ user, token: 'login-token' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'Customer@crema.com', password: 'Demo1234' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user, token: 'login-token' });
    expect(authService.login).toHaveBeenCalledWith({ email: 'customer@crema.com', password: 'Demo1234' });
  });

  it('answers 400 when the password is missing, and never calls the service', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'customer@crema.com' });
    expect(res.status).toBe(400);
    expect(res.body.details).toEqual([{ field: 'password', message: 'Password is required' }]);
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('answers 401 for wrong credentials', async () => {
    authService.login.mockRejectedValue(unauthorized('Email or password is incorrect'));
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'customer@crema.com', password: 'Wrong1234' });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Email or password is incorrect' });
  });
});

describe('GET /api/auth/me', () => {
  it('answers 200 with { user } for the id inside the token', async () => {
    authService.getMe.mockResolvedValue(user);
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${validToken()}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user });
    expect(authService.getMe).toHaveBeenCalledWith(7);
  });

  it('answers 401 without a token, and never calls the service', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(authService.getMe).not.toHaveBeenCalled();
  });

  it('answers 404 when the user in the token no longer exists', async () => {
    authService.getMe.mockRejectedValue(notFound('User not found'));
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${validToken()}`);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'User not found' });
  });
});

describe('rate limit on the real routes', () => {
  // Keep this test last in the file: after it, this IP has used up its 50 requests.
  it('counts login and register together and blocks both after 50 requests', async () => {
    env.nodeEnv = 'production'; // the limiter is skipped when NODE_ENV is test
    try {
      for (let i = 0; i < 50; i += 1) {
        const res = await request(app).post('/api/auth/login').send({});
        expect(res.status).toBe(400); // bad input still counts as an attempt
      }
      const login = await request(app).post('/api/auth/login').send({});
      const register = await request(app).post('/api/auth/register').send({});
      expect(login.status).toBe(429);
      expect(register.status).toBe(429);
      expect(register.body.error).toMatch(/too many/i);
    } finally {
      env.nodeEnv = 'test';
    }
  });
});

describe('unexpected service errors', () => {
  const crash = new Error('database password is secret');

  it('POST /auth/register answers a generic 500', async () => {
    authService.register.mockRejectedValue(crash);
    const res = await request(app).post('/api/auth/register').send(form);
    expect(res.status).toBe(500);
    expect(res.body.error).not.toMatch(/password/);
  });

  it('POST /auth/login answers a generic 500', async () => {
    authService.login.mockRejectedValue(crash);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'customer@crema.com', password: 'Demo1234' });
    expect(res.status).toBe(500);
    expect(res.body.error).not.toMatch(/password/);
  });

  it('GET /auth/me answers a generic 500', async () => {
    authService.getMe.mockRejectedValue(crash);
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${validToken()}`);
    expect(res.status).toBe(500);
    expect(res.body.error).not.toMatch(/password/);
  });
});
