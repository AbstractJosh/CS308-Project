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
// Uses requireAuth and validate from the AUTH block above.
import * as cartController from '../controllers/cart.controller.js';
import {
  cartItemSchema,
  cartMergeSchema,
  cartProductParamSchema,
  cartQuantitySchema,
} from '../utils/validators.js';

// ----- imports: ORDERS (Luis, Ulukan) -----
// Uses requireAuth and validate from the AUTH block and idParamSchema from the CATALOG block.
import * as ordersController from '../controllers/orders.controller.js';
// SCRUM-59 (Luis): POST /checkout. requireRole comes from the ADMIN block below.
import * as checkoutController from '../controllers/checkout.controller.js';
import { checkoutSchema } from '../utils/validators.js';

// ----- imports: WISHLIST (Ulukan) -----
// Uses requireAuth and validate from the AUTH block, cartProductParamSchema from the CART
// block and requireRole from the ADMIN block.
import * as wishlistController from '../controllers/wishlist.controller.js';

// ----- imports: INVOICES (Murat) -----
// Uses requireAuth and validate from the AUTH block and idParamSchema from the CATALOG block.
import * as invoicesController from '../controllers/invoices.controller.js';

// ----- imports: ADMIN (Neslihan, Murat, Sidar) -----
// Uses requireAuth and validate from the AUTH block above.
import { requireRole } from '../middleware/auth.js';
import * as deliveriesController from '../controllers/deliveries.controller.js';
import { deliveryListQuerySchema, orderStatusSchema } from '../utils/validators.js';

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
router.get('/cart', requireAuth, cartController.get);
router.post('/cart/items', requireAuth, validate(cartItemSchema), cartController.addItem);
router.patch(
  '/cart/items/:productId',
  requireAuth,
  validate(cartProductParamSchema, 'params'),
  validate(cartQuantitySchema),
  cartController.updateItem,
);
router.delete(
  '/cart/items/:productId',
  requireAuth,
  validate(cartProductParamSchema, 'params'),
  cartController.removeItem,
);
router.delete('/cart', requireAuth, cartController.clear);
router.post('/cart/merge', requireAuth, validate(cartMergeSchema), cartController.merge);

// ===== ORDERS (Luis, Ulukan) =====
// Order history (SCRUM-105): the user's own orders; one order for its customer or staff.
router.get('/orders', requireAuth, ordersController.list);
router.get('/orders/:id', requireAuth, validate(idParamSchema, 'params'), ordersController.getById);
// Checkout (SCRUM-59): customers only (handbook 8.3). Pays the cart and answers
// 201 { order, invoice, emailSent }; 400 card/address/empty cart, 402 bank, 409 stock.
router.post('/checkout', requireAuth, requireRole('CUSTOMER'), validate(checkoutSchema), checkoutController.create);

// ===== WISHLIST (Ulukan) =====
// SCRUM-80: customers only (handbook 8.4). Every route answers 200 { products }.
router.get('/wishlist', requireAuth, requireRole('CUSTOMER'), wishlistController.list);
router.post(
  '/wishlist',
  requireAuth,
  requireRole('CUSTOMER'),
  validate(cartProductParamSchema),
  wishlistController.add,
);
router.delete(
  '/wishlist/:productId',
  requireAuth,
  requireRole('CUSTOMER'),
  validate(cartProductParamSchema, 'params'),
  wishlistController.remove,
);

// ===== INVOICES (Murat) =====
// The invoice PDF: the order's customer, product managers and sales managers only (SCRUM-49, req 4).
router.get('/invoices/:id/pdf', requireAuth, validate(idParamSchema, 'params'), invoicesController.pdf);

// ===== ADMIN (Neslihan, Murat, Sidar) =====
// Delivery list for the product manager (Neslihan, SCRUM-57, req 12).
router.get(
  '/admin/deliveries',
  requireAuth,
  requireRole('PRODUCT_MANAGER'),
  validate(deliveryListQuerySchema, 'query'),
  deliveriesController.list,
);
// Move an order forward: PROCESSING -> IN_TRANSIT -> DELIVERED (Neslihan, SCRUM-60, req 12).
router.patch(
  '/admin/orders/:id/status',
  requireAuth,
  requireRole('PRODUCT_MANAGER'),
  validate(idParamSchema, 'params'),
  validate(orderStatusSchema),
  deliveriesController.updateStatus,
);

export default router;
