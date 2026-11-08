// SCRUM-12: checks the SQL that the first migration generates.
// knex can build the SQL text without connecting, so no database is needed.
import { describe, it, expect } from 'vitest';
import knex from 'knex';
import { up, down } from '../../db/migrations/20261105_001_init.js';

const db = knex({ client: 'pg' });
const upSql = up(db).toString();
const downSql = down(db).toString();

describe('migration 20261105_001_init', () => {
  it('creates the five Sprint 1 tables, parents before children', () => {
    const order = ['users', 'categories', 'products', 'carts', 'cart_items'].map((t) =>
      upSql.indexOf(`create table "${t}"`),
    );
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('gives users a native user_role enum with the four roles, default CUSTOMER', () => {
    expect(upSql).toContain(
      `create type "user_role" as enum ('CUSTOMER', 'SALES_MANAGER', 'PRODUCT_MANAGER', 'SUPPORT_AGENT')`,
    );
    expect(upSql).toContain(`"role" "user_role" not null default 'CUSTOMER'`);
    expect(upSql).toContain('"users_email_unique" unique ("email")');
  });

  it('protects products with CHECK constraints, a unique serial number and a category index', () => {
    expect(upSql).toContain('check (quantity_in_stock >= 0)');
    expect(upSql).toContain('check (price >= 0)');
    expect(upSql).toContain('"price" decimal(10, 2) not null');
    expect(upSql).toContain('"cost" decimal(10, 2) null');
    expect(upSql).toContain('unique ("serial_number")');
    expect(upSql).toContain('foreign key ("category_id") references "categories" ("id")');
    expect(upSql).toContain('create index "products_category_id_index" on "products" ("category_id")');
  });

  it('gives each user one cart and each product one line per cart', () => {
    expect(upSql).toContain('"carts_user_id_unique" unique ("user_id")');
    expect(upSql).toContain('references "users" ("id") on delete CASCADE');
    expect(upSql).toContain('references "carts" ("id") on delete CASCADE');
    expect(upSql).toContain('unique ("cart_id", "product_id")');
    expect(upSql).toContain('check (quantity > 0)');
  });

  it('down drops the tables in reverse order and then the enum type', () => {
    const order = ['cart_items', 'carts', 'products', 'categories', 'users'].map((t) =>
      downSql.indexOf(`drop table if exists "${t}"`),
    );
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(downSql.trim().endsWith('DROP TYPE IF EXISTS user_role')).toBe(true);
  });
});
