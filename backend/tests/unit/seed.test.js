// SCRUM-12: checks the seed data against handbook Appendix A and section 6.4,
// and runs seed() against a fake knex that only records calls (no database).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import {
  categories,
  products,
  demoUsers,
  DEMO_PASSWORD,
  seed,
} from '../../db/seeds/01_catalog_and_users.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const photosDir = path.resolve(here, '../../../frontend/public/images/products');

describe('seed data: categories', () => {
  it('has the 10 categories of Appendix A in order', () => {
    expect(categories.map((c) => c.slug)).toEqual([
      'espresso-machines',
      'automatic-machines',
      'filter-machines',
      'turkish-coffee-machines',
      'french-press-moka',
      'professional-machines',
      'coffee',
      'grinders',
      'coffee-serving',
      'care-accessories',
    ]);
    expect(categories.every((c) => c.name && c.description)).toBe(true);
  });
});

describe('seed data: products', () => {
  it('has 51 products with the per-category counts of handbook 2.2', () => {
    expect(products).toHaveLength(51);
    const counts = {};
    for (const p of products) counts[p.categorySlug] = (counts[p.categorySlug] || 0) + 1;
    expect(counts).toEqual({
      'espresso-machines': 8,
      'automatic-machines': 9,
      'filter-machines': 6,
      'turkish-coffee-machines': 1,
      'french-press-moka': 4,
      'professional-machines': 2,
      coffee: 6,
      grinders: 4,
      'coffee-serving': 5,
      'care-accessories': 6,
    });
  });

  it('uses unique serial numbers in the CRM-XX-0000 format', () => {
    const serials = products.map((p) => p.serial_number);
    expect(new Set(serials).size).toBe(51);
    expect(serials.every((s) => /^CRM-[A-Z]{2}-\d{4}$/.test(s))).toBe(true);
  });

  it('fills every requirement 9 field with a valid value', () => {
    for (const p of products) {
      for (const field of ['name', 'model', 'description', 'warranty_status', 'distributor']) {
        expect(typeof p[field] === 'string' && p[field].length > 0, `${p.serial_number} ${field}`).toBe(true);
      }
      expect(Number.isInteger(p.quantity_in_stock) && p.quantity_in_stock >= 0).toBe(true);
      expect(p.price).toBeGreaterThan(0);
      expect(Number.isInteger(p.popularity) && p.popularity >= 0).toBe(true);
    }
  });

  it('keeps the three sold-out products for the requirement 7 demo', () => {
    const soldOut = products.filter((p) => p.quantity_in_stock === 0).map((p) => p.serial_number);
    expect(soldOut).toEqual(['CRM-EM-1007', 'CRM-FP-5003', 'CRM-CF-7006']);
  });

  it('matches image_count to the photos in frontend/public/images/products', () => {
    for (const p of products) {
      expect(p.image_count).toBeGreaterThanOrEqual(1);
      expect(p.image_count).toBeLessThanOrEqual(8);
      const files = fs.readdirSync(path.join(photosDir, p.serial_number)).filter((f) => f.endsWith('.jpg'));
      const expected = Array.from({ length: p.image_count }, (_, i) => `${String(i + 1).padStart(2, '0')}.jpg`);
      expect(files.sort(), p.serial_number).toEqual(expected);
    }
  });
});

describe('seed data: demo users', () => {
  it('has one demo account per role', () => {
    expect(demoUsers.map((u) => [u.email, u.role])).toEqual([
      ['customer@crema.com', 'CUSTOMER'],
      ['pm@crema.com', 'PRODUCT_MANAGER'],
      ['sales@crema.com', 'SALES_MANAGER'],
      ['support@crema.com', 'SUPPORT_AGENT'],
    ]);
  });
});

// A fake knex: knex('table') returns a small object whose methods record what was asked.
function fakeKnex() {
  const calls = [];
  let nextId = 1;
  const knex = (table) => ({
    del: async () => calls.push({ table, op: 'del' }),
    insert: (rows) => {
      const call = { table, op: 'insert', rows };
      calls.push(call);
      const result = Promise.resolve();
      result.returning = async () => rows.map((r) => ({ id: nextId++, slug: r.slug }));
      result.onConflict = (column) => ({
        merge: async (columns) => Object.assign(call, { onConflict: column, merge: columns }),
      });
      return result;
    },
  });
  return { knex, calls };
}

describe('seed()', () => {
  it('empties the Sprint 2 order tables and the cart before the catalog, then inserts categories, products and users', async () => {
    const { knex, calls } = fakeKnex();
    await seed(knex);
    expect(calls.map((c) => `${c.op} ${c.table}`)).toEqual([
      'del invoices',
      'del payments',
      'del deliveries',
      'del order_items',
      'del orders',
      'del cart_items',
      'del carts',
      'del products',
      'del categories',
      'insert categories',
      'insert products',
      'insert users',
    ]);
  });

  it('links each product to its category id and only uses real column names', async () => {
    const { knex, calls } = fakeKnex();
    await seed(knex);
    const rows = calls.find((c) => c.op === 'insert' && c.table === 'products').rows;
    expect(rows[0].category_id).toBe(1); // espresso-machines is inserted first
    expect(rows.find((r) => r.serial_number === 'CRM-AC-9506').category_id).toBe(10);
    expect(rows.every((r) => !('categorySlug' in r))).toBe(true);
  });

  it('stores a bcrypt hash, never the plain password, and only updates the role on re-run', async () => {
    const { knex, calls } = fakeKnex();
    await seed(knex);
    const users = calls.find((c) => c.op === 'insert' && c.table === 'users');
    expect(users.onConflict).toBe('email');
    expect(users.merge).toEqual(['role']);
    for (const u of users.rows) {
      expect(u).not.toHaveProperty('password');
      expect(u.password_hash).not.toBe(DEMO_PASSWORD);
      expect(await bcrypt.compare(DEMO_PASSWORD, u.password_hash)).toBe(true);
      expect(u.tax_id).toBe('1234567890');
    }
  });
});
