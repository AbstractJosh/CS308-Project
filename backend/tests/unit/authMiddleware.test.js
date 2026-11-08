import { describe, it, expect, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { env } from '../../src/config/env.js';
import { authLimiter, requireAuth, requireRole } from '../../src/middleware/auth.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';

const SECRET = 'test-secret'; // set in vitest.config.js
const bearer = (token) => `Bearer ${token}`;
const tokenFor = (sub, role) => jwt.sign({ sub, role }, SECRET);

// A tiny app that uses the middleware the same way routes/index.js does.
function makeApp() {
  const app = express();
  app.get('/private', requireAuth, (req, res) => res.json({ user: req.user }));
  app.get('/staff', requireAuth, requireRole('PRODUCT_MANAGER', 'SALES_MANAGER'), (req, res) => res.json({ ok: true }));
  app.post('/login', authLimiter, (req, res) => res.json({ ok: true }));
  app.use(errorHandler);
  return app;
}

describe('requireAuth', () => {
  const app = makeApp();

  it('sets req.user to the id and role from a valid token', async () => {
    const res = await request(app).get('/private').set('Authorization', bearer(tokenFor(7, 'CUSTOMER')));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user: { id: 7, role: 'CUSTOMER' } });
  });

  it.each([
    ['no header', undefined],
    ['an empty Bearer value', 'Bearer '],
    ['another scheme', `Basic ${tokenFor(7, 'CUSTOMER')}`],
    ['a garbage token', bearer('not-a-token')],
    ['a token signed with another secret', bearer(jwt.sign({ sub: 7, role: 'CUSTOMER' }, 'other-secret'))],
    ['an expired token', bearer(jwt.sign({ sub: 7, role: 'CUSTOMER' }, SECRET, { expiresIn: -10 }))],
  ])('answers 401 in the error format for %s', async (_label, header) => {
    const req = request(app).get('/private');
    if (header) req.set('Authorization', header);
    const res = await req;
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Please log in first' });
  });
});

describe('requireRole', () => {
  const app = makeApp();

  it.each(['PRODUCT_MANAGER', 'SALES_MANAGER'])('lets %s through', async (role) => {
    const res = await request(app).get('/staff').set('Authorization', bearer(tokenFor(1, role)));
    expect(res.status).toBe(200);
  });

  it.each(['CUSTOMER', 'SUPPORT_AGENT'])('answers 403 for %s', async (role) => {
    const res = await request(app).get('/staff').set('Authorization', bearer(tokenFor(1, role)));
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'You do not have permission to do this' });
  });
});

describe('authLimiter', () => {
  const originalNodeEnv = env.nodeEnv;
  afterEach(() => {
    env.nodeEnv = originalNodeEnv;
  });

  // Sends the given number of requests one by one and returns the last response.
  async function sendLogins(app, count) {
    let res;
    for (let i = 0; i < count; i += 1) res = await request(app).post('/login');
    return res;
  }

  it('does not limit anything when NODE_ENV is test', async () => {
    const res = await sendLogins(makeApp(), 51);
    expect(res.status).toBe(200);
  });

  // Keep this test last: the limiter's counter is shared within this file.
  it('allows 50 requests from one IP and blocks the 51st with a JSON error', async () => {
    env.nodeEnv = 'production';
    const app = makeApp();
    expect((await sendLogins(app, 50)).status).toBe(200);

    const blocked = await request(app).post('/login');
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toMatch(/too many/i);
  });
});
