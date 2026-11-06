import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { forbidden, unauthorized } from '../utils/httpError.js';
import { verifyToken } from '../utils/jwt.js';

// Protects a route: checks "Authorization: Bearer <token>" and sets req.user = { id, role }.
// The role comes from the signed token, never from the request body (handbook 7.8).
export function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) return next(unauthorized());

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return next(unauthorized());
  }
  req.user = { id: payload.sub, role: payload.role };
  return next();
}

// Use after requireAuth: router.get('/admin/x', requireAuth, requireRole('PRODUCT_MANAGER'), ...)
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) return next(forbidden());
    return next();
  };
}

// Slows password guessing on login and register: 50 requests per 15 minutes per IP (handbook 7.2).
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  skip: () => env.nodeEnv === 'test',
  message: { error: 'Too many attempts. Please try again later.' },
});
