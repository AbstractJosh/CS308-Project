import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

// The login token holds only the user id (sub) and role, signed so nobody can change them.
export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

// Returns the token's payload. Throws if the token is forged or expired.
export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}
