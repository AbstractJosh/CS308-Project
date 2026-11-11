// Sprint 2 (Ulukan): checks the SQL that migration 003_payments generates.
// knex can build the SQL text without connecting, so no database is needed.
import { describe, it, expect } from 'vitest';
import knex from 'knex';
import { up, down } from '../../db/migrations/20261110_003_payments.js';

const db = knex({ client: 'pg' });
const upSql = up(db).toString();
const downSql = down(db).toString();

describe('migration 20261110_003_payments', () => {
  it('only creates the payments table', () => {
    const created = [...upSql.matchAll(/create table "(\w+)"/g)].map((m) => m[1]);
    expect(created).toEqual(['payments']);
  });

  it('has exactly the columns of handbook 6.2: no column for the full card number or the CVV', () => {
    // In the create statement the quoted names are the table, then one per column.
    const createStatement = upSql.match(/create table "payments" \([^;]*\)/)[0];
    const columns = [...createStatement.matchAll(/"(\w+)"/g)].map((m) => m[1]).slice(1);
    expect(columns).toEqual([
      'id',
      'order_id',
      'card_hash',
      'card_last4',
      'amount',
      'status',
      'bank_reference',
      'created_at',
    ]);
  });

  it('keeps only a 64 character hash and the last 4 digits of the card', () => {
    expect(upSql).toContain('"card_hash" varchar(64) not null');
    expect(upSql).toContain('"card_last4" varchar(4) not null');
  });

  it('gives each order at most one payment, and every payment an order', () => {
    expect(upSql).toContain('"order_id" integer not null');
    expect(upSql).toContain('"payments_order_id_unique" unique ("order_id")');
    expect(upSql).toContain('foreign key ("order_id") references "orders" ("id")');
  });

  it('stores the amount as exact money, a status, the bank reference and when it was paid', () => {
    expect(upSql).toContain('"amount" decimal(10, 2) not null');
    expect(upSql).toContain('"status" varchar(20) not null');
    expect(upSql).toContain('"bank_reference" varchar(40)');
    expect(upSql).toContain('"created_at" timestamptz not null default CURRENT_TIMESTAMP');
  });

  it('has no default status, so a payment is never APPROVED by accident', () => {
    expect(upSql).not.toMatch(/"status" varchar\(20\) not null default/);
  });

  it('down drops only the payments table', () => {
    expect(downSql.trim()).toBe('drop table if exists "payments"');
  });
});
