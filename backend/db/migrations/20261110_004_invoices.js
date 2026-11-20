// Sprint 2, SCRUM-47 (Murat): invoices, exactly as in handbook section 6.2.
// It points to orders, so 002_orders (Luis) and 003_payments (Ulukan) run first.
// Never edit this file once it is on develop; add a new migration instead.

// One invoice per order. The checkout writes it in the same transaction as the order and
// the payment (handbook 7.4 step 5), with invoice_number = 'INV-' + order id padded to 6
// digits, e.g. order 123 -> INV-000123.
export function up(knex) {
  return knex.schema.createTable('invoices', (table) => {
    table.increments('id');
    // unique: an order never gets two invoices.
    table.integer('order_id').notNullable().unique().references('id').inTable('orders');
    // unique: the number printed on the PDF identifies exactly one invoice.
    table.string('invoice_number', 20).notNullable().unique();
    // The amount billed, copied from the order at sale time.
    table.decimal('total', 10, 2).notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });
}

// Drops only this migration's table.
export function down(knex) {
  return knex.schema.dropTableIfExists('invoices');
}
