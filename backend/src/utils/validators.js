import { z } from 'zod';

// Every zod schema for request bodies and queries lives in this file (handbook 5.4).
// Shared file: only ADD your schemas inside your own area's block below.
// Never rewrite, reorder or delete other people's lines.

// Small helper for "/:id" style params, usable by every area.
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive({ message: 'Invalid id' }),
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
    .regex(/\d/, { message: 'Password must contain a number' }),
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

// ===== CART (Luis) =====

// ===== ORDERS (Luis, Ulukan) =====

// ===== ADMIN (Neslihan, Murat, Sidar) =====
