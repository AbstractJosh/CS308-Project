import { describe, it, expect, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { env } from '../../src/config/env.js';
import { signToken, verifyToken } from '../../src/utils/jwt.js';

const SECRET = 'test-secret'; // set in vitest.config.js

describe('signToken', () => {
  const originalExpiresIn = env.jwtExpiresIn;
  afterEach(() => {
    env.jwtExpiresIn = originalExpiresIn;
  });

  it('puts only the user id and role in the token, never other user fields', () => {
    const token = signToken({ id: 7, role: 'CUSTOMER', email: 'a@crema.com', passwordHash: 'secret-hash' });
    const payload = jwt.verify(token, SECRET);
    expect(payload.sub).toBe(7);
    expect(payload.role).toBe('CUSTOMER');
    expect(Object.keys(payload).sort()).toEqual(['exp', 'iat', 'role', 'sub']);
  });

  it('uses the lifetime from the JWT_EXPIRES_IN setting', () => {
    env.jwtExpiresIn = '1h';
    const { iat, exp } = jwt.verify(signToken({ id: 7, role: 'CUSTOMER' }), SECRET);
    expect(exp - iat).toBe(3600);
  });
});

describe('verifyToken', () => {
  it('returns the payload of a valid token', () => {
    const payload = verifyToken(jwt.sign({ sub: 3, role: 'SALES_MANAGER' }, SECRET));
    expect(payload.sub).toBe(3);
    expect(payload.role).toBe('SALES_MANAGER');
  });

  it('rejects a token whose role was changed after signing', () => {
    const [header, , signature] = jwt.sign({ sub: 3, role: 'CUSTOMER' }, SECRET).split('.');
    const forgedPayload = Buffer.from(JSON.stringify({ sub: 3, role: 'SALES_MANAGER' })).toString('base64url');
    expect(() => verifyToken(`${header}.${forgedPayload}.${signature}`)).toThrow();
  });

  it('rejects a token signed with another secret', () => {
    expect(() => verifyToken(jwt.sign({ sub: 3, role: 'CUSTOMER' }, 'other-secret'))).toThrow();
  });

  it('rejects an expired token', () => {
    expect(() => verifyToken(jwt.sign({ sub: 3, role: 'CUSTOMER' }, SECRET, { expiresIn: -10 }))).toThrow();
  });
});
