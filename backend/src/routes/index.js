import { Router } from 'express';

// Every /api route is registered in this one file (handbook 5.4 and 8).
// Shared file: only ADD your lines inside your own area's blocks (imports at the top,
// routes below). Never rewrite, reorder or delete other people's lines.

// ----- imports: AUTH (Ulukan) -----

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

// ===== CATALOG (Luis, Sidar) =====
router.get('/categories', categoriesController.list);
router.get('/products', validateCatalog(productListQuerySchema, 'query'), productsController.list);
router.get('/products/:id', validateCatalog(idParamSchema, 'params'), productsController.getById);

// ===== CART (Luis) =====

// ===== ORDERS (Luis, Ulukan) =====

// ===== ADMIN (Neslihan, Murat, Sidar) =====

export default router;
