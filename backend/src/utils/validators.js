import { z } from 'zod';

// Every zod schema for request bodies and queries lives in this file (handbook 5.4).
// Shared file: only ADD your schemas inside your own area's block below.
// Never rewrite, reorder or delete other people's lines.

// Small helper for "/:id" style params, usable by every area.
export const idParamSchema = z.object({
  id: z.coerce
    .number({ invalid_type_error: 'Invalid id' })
    .int({ message: 'Invalid id' })
    .positive({ message: 'Invalid id' })
    .max(2147483647, { message: 'Invalid id' }),
});

// ===== AUTH (Ulukan) =====
const emailField = z
  .string({ required_error: 'Email is required' })
  .trim()
  .toLowerCase()
  .email({ message: 'Enter a valid email' })
  .max(255, { message: 'Email is too long' });

// Unknown fields are dropped, so a "role" in the body never reaches the service.
export const registerSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, { message: 'Name must be 2 to 100 characters' })
    .max(100, { message: 'Name must be 2 to 100 characters' }),
  email: emailField,
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, { message: 'Password must be 8 to 72 characters' })
    .max(72, { message: 'Password must be 8 to 72 characters' })
    .regex(/\p{L}/u, { message: 'Password must contain a letter' })
    .regex(/\d/, { message: 'Password must contain a number' })
    // bcrypt only reads 72 bytes, and letters like ş take 2 bytes, so count bytes as well.
    // Over 72 characters already has its message above, so it doesn't get this one too.
    .refine((password) => password.length > 72 || Buffer.byteLength(password, 'utf8') <= 72, {
      message: 'Password is too long: letters like ş count as 2 of the 72 characters',
    }),
  taxId: z
    .string({ required_error: 'Tax ID is required' })
    .regex(/^\d{10,11}$/, { message: 'Tax ID must be 10 or 11 digits' }),
  homeAddress: z
    .string({ required_error: 'Home address is required' })
    .trim()
    .min(10, { message: 'Home address must be 10 to 300 characters' })
    .max(300, { message: 'Home address must be 10 to 300 characters' }),
});

// Login only checks that a password was sent; the register rules are not applied here.
export const loginSchema = z.object({
  email: emailField,
  password: z.string({ required_error: 'Password is required' }).min(1, { message: 'Password is required' }),
});

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
// Ids that come in the URL or the body: whole numbers that fit in a PostgreSQL int.
const cartProductId = z.coerce
  .number({ required_error: 'Product is required', invalid_type_error: 'Invalid product' })
  .int({ message: 'Invalid product' })
  .positive({ message: 'Invalid product' })
  .max(2147483647, { message: 'Invalid product' });

// Quantity of one cart line: 1 to 99 (handbook 7.3). Not coerced, so "2" in a JSON body is refused.
const cartQuantity = z
  .number({ required_error: 'Quantity is required', invalid_type_error: 'Quantity must be a number' })
  .int({ message: 'Quantity must be a whole number' })
  .min(1, { message: 'Quantity must be 1 to 99' })
  .max(99, { message: 'Quantity must be 1 to 99' });

// POST /cart/items
export const cartItemSchema = z.object({
  productId: cartProductId,
  quantity: cartQuantity,
});

// PATCH /cart/items/:productId (body)
export const cartQuantitySchema = z.object({
  quantity: cartQuantity,
});

// PATCH and DELETE /cart/items/:productId (params)
export const cartProductParamSchema = z.object({
  productId: cartProductId,
});

// POST /cart/merge: the guest cart from localStorage, at most 50 lines.
export const cartMergeSchema = z.object({
  items: z
    .array(z.object({ productId: cartProductId, quantity: cartQuantity }), {
      required_error: 'Items are required',
      invalid_type_error: 'Items must be a list',
    })
    .max(50, { message: 'A cart can have at most 50 items' }),
});

// ===== ORDERS (Luis, Ulukan) =====

// ===== ADMIN (Neslihan, Murat, Sidar) =====
