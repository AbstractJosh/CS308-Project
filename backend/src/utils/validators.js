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
  q: z
    .string({ invalid_type_error: 'Invalid search' })
    .trim()
    .max(100, { message: 'Search must be at most 100 characters' })
    .optional()
    .transform((value) => value || undefined),
  sort: z
    .enum(['price_asc', 'price_desc', 'popularity', 'newest'], {
      errorMap: () => ({ message: 'Sort must be price_asc, price_desc, popularity or newest' }),
    })
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
// SCRUM-44 (Ulukan): the card of POST /checkout, with the rules and messages of docs/API.md
// "Fake bank rules". The checkout schema uses it as `card: cardSchema`, so the fields in
// details come out as `card.number`, `card.cvv` and so on.
// The import stays inside this block (shared file: lines are only added in your own block);
// JavaScript reads imports first wherever they are written.
import { cardDigits, isCardExpired, isValidCardNumber } from './cardUtils.js';

// A text field of the card: missing or empty gives `required`, a failed check gives `invalid`.
// One function, so a field never gets two messages. `clean` runs before the check.
const cardText = (required, invalid, clean, isValid) =>
  z
    .string({ required_error: required, invalid_type_error: invalid })
    .transform(clean)
    .superRefine((value, ctx) => {
      if (!value) ctx.addIssue({ code: z.ZodIssueCode.custom, message: required });
      else if (!isValid(value)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: invalid });
    });

// A whole number from min to max. Not coerced, so "11" in a JSON body is refused.
const cardWholeNumber = (required, invalid, min, max) =>
  z
    .number({ required_error: required, invalid_type_error: invalid })
    .refine((value) => Number.isInteger(value) && value >= min && value <= max, { message: invalid });

const cardExpiryMonth = cardWholeNumber('Expiry month is required', 'Enter a valid expiry month', 1, 12);
const cardExpiryYear = cardWholeNumber('Expiry year is required', 'Enter a valid expiry year', 1000, 9999);

export const cardSchema = z
  .object(
    {
      // Spaces are removed, so the service gets the digits only.
      number: cardText('Card number is required', 'Enter a valid card number', cardDigits, isValidCardNumber),
      holderName: cardText(
        'Name on card is required',
        'Name on card must be 2 to 100 characters',
        (name) => name.trim(),
        (name) => name.length >= 2 && name.length <= 100,
      ),
      expiryMonth: cardExpiryMonth,
      expiryYear: cardExpiryYear,
      // Text, not a number, so a leading zero is kept. It is checked here and never saved.
      cvv: cardText(
        'CVV is required',
        'CVV must be 3 or 4 digits',
        (cvv) => cvv,
        (cvv) => /^\d{3,4}$/.test(cvv),
      ),
    },
    { required_error: 'Card details are required', invalid_type_error: 'Card details are required' },
  )
  // Expiry needs the month and the year together. Only checked when both are valid on their own,
  // so a month like 0 gets "Enter a valid expiry month" and not "This card has expired" as well.
  .superRefine((card, ctx) => {
    const bothValid =
      cardExpiryMonth.safeParse(card.expiryMonth).success && cardExpiryYear.safeParse(card.expiryYear).success;
    if (bothValid && isCardExpired(card.expiryMonth, card.expiryYear)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['expiryMonth'], message: 'This card has expired' });
    }
  });

// SCRUM-59 (Luis): the body of POST /checkout (handbook 8.3, docs/API.md).
// deliveryAddress: 10 to 300 characters after trimming, with the checkout page's messages.
// cardText (above) gives one message per field: "required" when empty, otherwise "invalid".
export const checkoutSchema = z.object({
  deliveryAddress: cardText(
    'Delivery address is required',
    'Delivery address must be 10 to 300 characters',
    (address) => address.trim(),
    (address) => address.length >= 10 && address.length <= 300,
  ),
  card: cardSchema,
});

// ===== ADMIN (Neslihan, Murat, Sidar) =====

// Delivery list (Neslihan, SCRUM-57)
// GET /admin/deliveries?completed=true|false (handbook 8.3). Without it, every delivery.
export const deliveryListQuerySchema = z.object({
  completed: z
    .enum(['true', 'false'], { errorMap: () => ({ message: 'completed must be true or false' }) })
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
});

// Order status (Neslihan, SCRUM-60)
// PATCH /admin/orders/:id/status body (handbook 8.3): the product manager moves an order forward.
export const orderStatusSchema = z.object({
  status: z.enum(['IN_TRANSIT', 'DELIVERED'], {
    errorMap: () => ({ message: 'Status must be IN_TRANSIT or DELIVERED' }),
  }),
});

// Product manager catalog (Murat, SCRUM-77, contract in docs/API.md from SCRUM-76)
// The limits are the column sizes of migration 001 (handbook 6.1); the messages are the
// same as the admin product form (frontend pages/admin/productForm.js).
const MAX_MONEY = 99999999.99; // DECIMAL(10, 2)
const MAX_INT = 2147483647; // integer column

function requiredText(label, max) {
  const text = z
    .string({ required_error: `${label} is required`, invalid_type_error: `${label} must be text` })
    .trim()
    .min(1, { message: `${label} is required` });
  return max ? text.max(max, { message: `${label} must be at most ${max} characters` }) : text;
}

// Whole kuruş only: 12.5 and 12.50 are fine, 12.505 is not.
const hasAtMostTwoDecimals = (value) => Math.abs(Math.round(value * 100) - value * 100) < 1e-6;

function money(label) {
  const message = `${label} must be a number, 0 or more`;
  return z
    .number({ required_error: `${label} is required`, invalid_type_error: message })
    .finite({ message })
    .min(0, { message })
    .max(MAX_MONEY, { message: `${label} must be below 100,000,000` })
    .refine(hasAtMostTwoDecimals, { message: `${label} can have at most 2 decimals` });
}

const stockNumber = z
  .number({
    required_error: 'Stock is required',
    invalid_type_error: 'Stock must be a whole number, 0 or more',
  })
  .int({ message: 'Stock must be a whole number, 0 or more' })
  .min(0, { message: 'Stock must be a whole number, 0 or more' })
  .max(MAX_INT, { message: 'Stock is too large' });

const productFields = {
  name: requiredText('Name', 150),
  model: requiredText('Model', 100),
  serialNumber: requiredText('Serial number', 60),
  description: requiredText('Description'),
  categoryId: z
    .number({ required_error: 'Choose a category', invalid_type_error: 'Choose a category' })
    .int({ message: 'Choose a category' })
    .positive({ message: 'Choose a category' })
    .max(MAX_INT, { message: 'Choose a category' }),
  price: money('Price'),
  cost: money('Cost').nullable(),
  quantityInStock: stockNumber,
  warrantyStatus: requiredText('Warranty', 100),
  distributor: requiredText('Distributor', 150),
};

// POST /admin/products: every field; cost may be null but must be sent.
export const productCreateSchema = z.object({ ...productFields, cost: productFields.cost.default(null) });

// PATCH /admin/products/:id: any of the same fields, at least one.
export const productUpdateSchema = z
  .object(productFields)
  .partial()
  .refine((body) => Object.values(body).some((value) => value !== undefined), {
    message: 'Send at least one field to change',
  });

// PATCH /admin/products/:id/stock: the new stock number.
export const productStockSchema = z.object({ quantityInStock: stockNumber });

// POST /admin/categories. slug is made from the name when it is left out.
export const categoryCreateSchema = z.object({
  name: requiredText('Name', 80),
  slug: z
    .string({ invalid_type_error: 'Slug must be text' })
    .trim()
    .max(80, { message: 'Slug must be at most 80 characters' })
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
      message: 'Slug can only have lowercase letters, digits and single dashes',
    })
    .optional(),
  description: z
    .string({ invalid_type_error: 'Description must be text' })
    .trim()
    .nullable()
    .optional()
    .transform((value) => (value ? value : null)),
});

// GET /admin/invoices?from=YYYY-MM-DD&to=YYYY-MM-DD, both optional and inclusive.
function isRealDate(text) {
  const date = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text;
}
const dateQuery = (name) =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: `${name} must be a date like 2026-11-30` })
    .refine(isRealDate, { message: `${name} must be a real date` })
    .optional();
export const invoiceListQuerySchema = z
  .object({ from: dateQuery('from'), to: dateQuery('to') })
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    message: 'from must not be after to',
    path: ['from'],
  });
