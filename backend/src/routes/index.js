import { Router } from 'express';

// Every /api route is registered in this one file (handbook 5.4 and 8).
// Shared file: only ADD your lines inside your own area's blocks (imports at the top,
// routes below). Never rewrite, reorder or delete other people's lines.

// ----- imports: AUTH (Ulukan) -----
// validate and requireAuth can only be imported once in this file. Other areas: use them, don't import them again.
import * as authController from '../controllers/auth.controller.js';
import { authLimiter, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, registerSchema } from '../utils/validators.js';

// ----- imports: CATALOG (Luis, Sidar) -----

// ----- imports: CART (Luis) -----

// ----- imports: ORDERS (Luis, Ulukan) -----

// ----- imports: ADMIN (Neslihan, Murat, Sidar) -----

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ===== AUTH (Ulukan) =====
router.post('/auth/register', authLimiter, validate(registerSchema), authController.register);
router.post('/auth/login', authLimiter, validate(loginSchema), authController.login);
router.get('/auth/me', requireAuth, authController.me);

// ===== CATALOG (Luis, Sidar) =====

// ===== CART (Luis) =====

// ===== ORDERS (Luis, Ulukan) =====

// ===== ADMIN (Neslihan, Murat, Sidar) =====

export default router;
