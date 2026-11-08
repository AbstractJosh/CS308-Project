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
// validate is imported under its own name here so this block does not clash with the AUTH block's import.
import * as productsController from '../controllers/products.controller.js';
import * as categoriesController from '../controllers/categories.controller.js';
import { validate as validateCatalog } from '../middleware/validate.js';
import { idParamSchema, productListQuerySchema } from '../utils/validators.js';

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
router.get('/categories', categoriesController.list);
router.get('/products', validateCatalog(productListQuerySchema, 'query'), productsController.list);
router.get('/products/:id', validateCatalog(idParamSchema, 'params'), productsController.getById);

// ===== CART (Luis) =====

// ===== ORDERS (Luis, Ulukan) =====

// ===== ADMIN (Neslihan, Murat, Sidar) =====

export default router;
