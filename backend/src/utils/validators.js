import { z } from 'zod';

// Every zod schema for request bodies and queries lives in this file (handbook 5.4).
// Shared file: only ADD your schemas inside your own area's block below.
// Never rewrite, reorder or delete other people's lines.

// Small helper for "/:id" style params, usable by every area.
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive({ message: 'Invalid id' }),
});

// ===== AUTH (Ulukan) =====

// ===== CATALOG (Luis, Sidar) =====
// SCRUM-13: GET /products?category=<slug>. Sprint 2: Sidar adds q, sort and inStock here.
export const productListQuerySchema = z.object({
  category: z
    .string()
    .trim()
    .toLowerCase()
    .max(80, { message: 'Invalid category' })
    .regex(/^[a-z0-9-]+$/, { message: 'Invalid category' })
    .optional(),
});

// ===== CART (Luis) =====

// ===== ORDERS (Luis, Ulukan) =====

// ===== ADMIN (Neslihan, Murat, Sidar) =====
