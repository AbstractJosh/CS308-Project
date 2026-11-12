// SCRUM-47 (Murat): checks the SQL that migration 004_invoices generates.
// knex can build the SQL text without connecting, so no database is needed.
import { describe, it, expect } from 'vitest';
import knex from 'knex';
import { up, down } from '../../db/migrations/20261110_004_invoices.js';

const db = knex({ client: 'pg' });
const upSql = up(db).toString();
const downSql = down(db).toString();

describe('migration 20261110_004_invoices', () => {
  it('only creates the invoices table', () => {
    const created = [...upSql.matchAll(/create table "(\w+)"/g)].map((m) => m[1]);
    expect(created).toEqual(['invoices']);
  });

  it('has exactly the columns of handbook 6.2', () => {
    // In the create statement the quoted names are the table, then one per column.
    const createStatement = upSql.match(/create table "invoices" \([^;]*\)/)[0];
    const columns = [...createStatement.matchAll(/"(\w+)"/g)].map((m) => m[1]).slice(1);
    expect(columns).toEqual(['id', 'order_id', 'invoice_number', 'total', 'created_at']);
    expect(upSql).toContain('"invoice_number" varchar(20) not null');
    expect(upSql).toContain('"total" decimal(10, 2) not null');
  });

  it('links every invoice to one order, and each order to at most one invoice', () => {
    expect(upSql).toContain('"order_id" integer not null');
    expect(upSql).toContain('"invoices_order_id_unique" unique ("order_id")');
    expect(upSql).toContain('foreign key ("order_id") references "orders" ("id")');
  });

  it('never allows two invoices with the same number', () => {
    expect(upSql).toContain('"invoices_invoice_number_unique" unique ("invoice_number")');
  });

  it('down drops only the invoices table', () => {
    expect(downSql.trim()).toBe('drop table if exists "invoices"');
  });
});
