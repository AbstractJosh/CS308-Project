// Sprint 2 (Luis): orders, order items and deliveries, exactly as in handbook section 6.2.
// 003_payments (Ulukan) and 004_invoices (Murat) point to orders, so this one runs first.
// Never edit this file once it is on develop; add a new migration instead.

const ORDER_STATUSES = ['PROCESSING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'];

export function up(knex) {
  return knex.schema
    .createTable('orders', (table) => {
      table.increments('id');
      table.integer('user_id').notNullable().references('id').inTable('users');
      // Native PostgreSQL enum: the database refuses any status that is not in ORDER_STATUSES.
      table
        .enu('status', ORDER_STATUSES, { useNative: true, enumName: 'order_status' })
        .notNullable()
        .defaultTo('PROCESSING');
      table.decimal('total', 10, 2).notNullable();
      table.string('delivery_address', 300).notNullable();
      table.string('card_last4', 4).notNullable();
      table.timestamps(true, true); // created_at, updated_at, default now
      table.timestamp('delivered_at').nullable(); // set when the order becomes DELIVERED
    })
    .createTable('order_items', (table) => {
      table.increments('id');
      table
        .integer('order_id')
        .notNullable()
        .references('id')
        .inTable('orders')
        .onDelete('CASCADE');
      table.integer('product_id').notNullable().references('id').inTable('products');
      table.integer('quantity').notNullable();
      // Prices are copied at sale time, so later price changes and discounts never change old orders.
      table.decimal('unit_price', 10, 2).notNullable(); // price actually paid
      table.decimal('unit_cost', 10, 2).notNullable(); // cost, or 50% of the price when cost is null
      table.check('quantity > 0', [], 'order_items_quantity_check');
    })
    // One delivery row per order item: the product manager's delivery list (req 12).
    .createTable('deliveries', (table) => {
      table.increments('id');
      table.integer('order_id').references('id').inTable('orders');
      table.integer('order_item_id').unique().references('id').inTable('order_items');
      table.integer('customer_id').references('id').inTable('users');
      table.integer('product_id').references('id').inTable('products');
      table.integer('quantity');
      table.decimal('total_price', 10, 2);
      table.string('delivery_address', 300);
      table.boolean('completed').notNullable().defaultTo(false);
    });
}

// Drops only this migration's tables (children before parents), then the enum type.
export function down(knex) {
  return knex.schema
    .dropTableIfExists('deliveries')
    .dropTableIfExists('order_items')
    .dropTableIfExists('orders')
    .raw('DROP TYPE IF EXISTS order_status');
}
