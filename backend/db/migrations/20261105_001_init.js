// SCRUM-12 (Murat): Sprint 1 tables, exactly as in handbook section 6.1.
// Design and diagram: docs/DATABASE.md (SCRUM-7).
// Never edit this file once it is on develop; add a new migration instead.

const ROLES = ['CUSTOMER', 'SALES_MANAGER', 'PRODUCT_MANAGER', 'SUPPORT_AGENT'];

export function up(knex) {
  return knex.schema
    .createTable('users', (table) => {
      table.increments('id');
      table.string('name', 100).notNullable();
      table.string('email', 255).notNullable().unique();
      table.string('password_hash', 255).notNullable();
      table.string('tax_id', 20).notNullable();
      table.string('home_address', 300).notNullable();
      // Native PostgreSQL enum: the database refuses any role that is not in ROLES.
      table
        .enu('role', ROLES, { useNative: true, enumName: 'user_role' })
        .notNullable()
        .defaultTo('CUSTOMER');
      table.timestamps(true, true); // created_at, updated_at, default now
    })
    .createTable('categories', (table) => {
      table.increments('id');
      table.string('name', 80).notNullable().unique();
      table.string('slug', 80).notNullable().unique();
      table.text('description');
    })
    .createTable('products', (table) => {
      table.increments('id');
      table.string('name', 150).notNullable();
      table.string('model', 100).notNullable();
      table.string('serial_number', 60).notNullable().unique();
      table.text('description').notNullable();
      table.integer('quantity_in_stock').notNullable().defaultTo(0);
      table.decimal('price', 10, 2).notNullable();
      table.decimal('cost', 10, 2).nullable(); // null = 50% of price
      table.string('warranty_status', 100).notNullable();
      table.string('distributor', 150).notNullable();
      table.integer('image_count').notNullable().defaultTo(1);
      table.integer('popularity').notNullable().defaultTo(0);
      table.boolean('is_active').notNullable().defaultTo(true);
      table.integer('category_id').notNullable().references('id').inTable('categories');
      table.timestamps(true, true);
      table.index('category_id');
      table.check('quantity_in_stock >= 0', [], 'products_quantity_in_stock_check');
      table.check('price >= 0', [], 'products_price_check');
    })
    .createTable('carts', (table) => {
      table.increments('id');
      table
        .integer('user_id')
        .notNullable()
        .unique()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.timestamps(true, true);
    })
    .createTable('cart_items', (table) => {
      table.increments('id');
      table
        .integer('cart_id')
        .notNullable()
        .references('id')
        .inTable('carts')
        .onDelete('CASCADE');
      table.integer('product_id').notNullable().references('id').inTable('products');
      table.integer('quantity').notNullable();
      table.unique(['cart_id', 'product_id']);
      table.check('quantity > 0', [], 'cart_items_quantity_check');
    });
}

// Drops the tables in reverse order (children before parents), then the enum type.
export function down(knex) {
  return knex.schema
    .dropTableIfExists('cart_items')
    .dropTableIfExists('carts')
    .dropTableIfExists('products')
    .dropTableIfExists('categories')
    .dropTableIfExists('users')
    .raw('DROP TYPE IF EXISTS user_role');
}
