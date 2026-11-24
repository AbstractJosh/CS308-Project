// Sprint 3 (Ulukan, SCRUM-80): wishlist_items, as in handbook 6.3.
// Never edit this file once it is on develop; add a new migration instead.
export function up(knex) {
  return knex.schema.createTable('wishlist_items', (table) => {
    // Deleting a user deletes their wishlist, like their cart.
    table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    // No cascade: products are never deleted, only hidden with is_active = false.
    table.integer('product_id').notNullable().references('id').inTable('products');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    // One row per user and product (handbook 7.7); adding it twice changes nothing.
    table.primary(['user_id', 'product_id']);
  });
}

// Drops only this migration's table.
export function down(knex) {
  return knex.schema.dropTableIfExists('wishlist_items');
}
