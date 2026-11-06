import { Router } from 'express';

// Every /api route is registered in this one file (handbook 5.4 and 8).
// Shared file: only ADD your lines inside your own area's blocks (imports at the top,
// routes below). Never rewrite, reorder or delete other people's lines.

// ----- imports: AUTH (Ulukan) -----

// ----- imports: CATALOG (Luis, Sidar) -----

// ----- imports: CART (Luis) -----

// ----- imports: ORDERS (Luis, Ulukan) -----

// ----- imports: ADMIN (Neslihan, Murat, Sidar) -----

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ===== AUTH (Ulukan) =====

// ===== CATALOG (Luis, Sidar) =====

// ===== CART (Luis) =====

// ===== ORDERS (Luis, Ulukan) =====

// ===== ADMIN (Neslihan, Murat, Sidar) =====

export default router;
