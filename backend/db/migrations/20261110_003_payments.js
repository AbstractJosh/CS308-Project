// Sprint 2 (Ulukan): payments, exactly as in handbook section 6.2.
// It points to orders, so 002_orders (Luis) runs first; 004_invoices (Murat) comes after.
// Never edit this file once it is on develop; add a new migration instead.

// Card data (req 17, handbook 7.8): there is no column for the full card number or the CVV,
// so they cannot be saved even by mistake. Only these two are kept:
//   card_hash  = SHA-256 of CARD_HASH_SECRET + card number, as 64 hex characters (handbook 7.4)
//   card_last4 = the last 4 digits, to show "card ending 4242"
export function up(knex) {
  return knex.schema.createTable('payments', (table) => {
    table.increments('id');
    // unique: one payment per order.
    table.integer('order_id').notNullable().unique().references('id').inTable('orders');
    table.string('card_hash', 64).notNullable();
    table.string('card_last4', 4).notNullable();
    table.decimal('amount', 10, 2).notNullable();
    // Checkout writes 'APPROVED'. No default, so a payment is never approved by accident.
    table.string('status', 20).notNullable();
    table.string('bank_reference', 40); // reference from bankService.charge
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });
}

// Drops only this migration's table.
export function down(knex) {
  return knex.schema.dropTableIfExists('payments');
}
