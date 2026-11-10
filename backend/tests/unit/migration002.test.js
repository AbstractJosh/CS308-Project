// Sprint 2 (Luis): checks the SQL that migration 002_orders generates.
// knex can build the SQL text without connecting, so no database is needed.
import { describe, it, expect } from 'vitest';
import knex from 'knex';
import { up, down } from '../../db/migrations/20261110_002_orders.js';

const db = knex({ client: 'pg' });
const upSql = up(db).toString();
const downSql = down(db).toString();

describe('migration 20261110_002_orders', () => {
  it('creates orders, order_items and deliveries, parents before children', () => {
    const order = ['orders', 'order_items', 'deliveries'].map((t) => upSql.indexOf(`create table "${t}"`));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('only creates its own tables', () => {
    const created = [...upSql.matchAll(/create table "(\w+)"/g)].map((m) => m[1]);
    expect(created).toEqual(['orders', 'order_items', 'deliveries']);
  });

  it('gives orders a native order_status enum with the four statuses, default PROCESSING', () => {
    expect(upSql).toContain(
      `create type "order_status" as enum ('PROCESSING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED')`,
    );
    expect(upSql).toContain(`"status" "order_status" not null default 'PROCESSING'`);
    expect(upSql).toContain('"total" decimal(10, 2) not null');
    expect(upSql).toContain('"card_last4" varchar(4) not null');
    expect(upSql).toContain('"delivered_at" timestamptz null');
    expect(upSql).toContain('foreign key ("user_id") references "users" ("id")');
  });

  it('stores the price paid and the cost on each order item, with a positive quantity', () => {
    expect(upSql).toContain('"unit_price" decimal(10, 2) not null');
    expect(upSql).toContain('"unit_cost" decimal(10, 2) not null');
    expect(upSql).toContain('check (quantity > 0)');
    expect(upSql).toContain('foreign key ("order_id") references "orders" ("id") on delete CASCADE');
    expect(upSql).toContain('foreign key ("product_id") references "products" ("id")');
  });

  it('gives each order item at most one delivery row, not completed by default', () => {
    expect(upSql).toContain('"deliveries_order_item_id_unique" unique ("order_item_id")');
    expect(upSql).toContain('foreign key ("order_item_id") references "order_items" ("id")');
    expect(upSql).toContain('foreign key ("customer_id") references "users" ("id")');
    expect(upSql).toContain('"completed" boolean not null default \'0\'');
  });

  it('down drops only its own tables in reverse order and then the enum type', () => {
    const order = ['deliveries', 'order_items', 'orders'].map((t) =>
      downSql.indexOf(`drop table if exists "${t}"`),
    );
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(downSql).not.toContain('"products"');
    expect(downSql.trim().endsWith('DROP TYPE IF EXISTS order_status')).toBe(true);
  });
});
