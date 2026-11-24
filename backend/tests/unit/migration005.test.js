// SCRUM-80 (Ulukan): checks the SQL that migration 005_wishlist generates.
// knex can build the SQL text without connecting, so no database is needed.
import { describe, it, expect } from 'vitest';
import knex from 'knex';
import { up, down } from '../../db/migrations/20261124_005_wishlist.js';

const db = knex({ client: 'pg' });
const upSql = up(db).toString();
const downSql = down(db).toString();

describe('migration 20261124_005_wishlist', () => {
  it('only creates the wishlist_items table, with the columns of handbook 6.3', () => {
    const created = [...upSql.matchAll(/create table "(\w+)"/g)].map((m) => m[1]);
    expect(created).toEqual(['wishlist_items']);
    expect(upSql).toContain('"user_id" integer not null');
    expect(upSql).toContain('"product_id" integer not null');
    expect(upSql).toContain('"created_at" timestamptz not null default CURRENT_TIMESTAMP');
  });

  it('keeps one row per user and product (handbook 7.7)', () => {
    expect(upSql).toContain('primary key ("user_id", "product_id")');
  });

  it('drops the wishlist with its user, but never lets a product row vanish under it', () => {
    expect(upSql).toContain('foreign key ("user_id") references "users" ("id") on delete CASCADE');
    expect(upSql).toMatch(/foreign key \("product_id"\) references "products" \("id"\)(?! on delete)/);
  });

  it('down drops only the wishlist_items table', () => {
    expect(downSql.trim()).toBe('drop table if exists "wishlist_items"');
  });
});
