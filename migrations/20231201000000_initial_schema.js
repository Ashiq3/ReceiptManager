/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema
        .createTable('users', table => {
            table.increments('user_id').primary();
            table.string('email', 255).unique().notNullable();
            table.string('password_hash', 255).notNullable();
            table.string('full_name', 255).notNullable();
            table.string('phone_number', 20);
            table.timestamp('created_at').defaultTo(knex.fn.now());
            table.timestamp('last_login');
            table.boolean('is_active').defaultTo(true);
            table.string('role', 20).defaultTo('business_owner');
        })
        .createTable('businesses', table => {
            table.increments('business_id').primary();
            table.integer('user_id').unsigned().references('user_id').inTable('users').onDelete('CASCADE');
            table.string('business_name', 255).notNullable();
            table.string('business_type', 100);
            table.text('address');
            table.string('tax_id', 50);
            table.timestamp('created_at').defaultTo(knex.fn.now());
            table.boolean('is_active').defaultTo(true);
        })
        .createTable('receipts', table => {
            table.increments('receipt_id').primary();
            table.integer('business_id').unsigned().references('business_id').inTable('businesses').onDelete('CASCADE');
            table.string('original_filename', 255);
            table.string('storage_path', 512);
            table.string('vendor_name', 255);
            table.date('receipt_date');
            table.decimal('total_amount', 10, 2);
            table.string('payment_method', 50);
            table.string('currency', 3);
            table.timestamp('processed_at').defaultTo(knex.fn.now());
            table.string('status', 20).defaultTo('processed');
            table.text('raw_text');
            table.decimal('confidence_score', 5, 2);
        })
        .createTable('receipt_items', table => {
            table.increments('item_id').primary();
            table.integer('receipt_id').unsigned().references('receipt_id').inTable('receipts').onDelete('CASCADE');
            table.text('item_description');
            table.decimal('quantity', 10, 2);
            table.decimal('unit_price', 10, 2);
            table.decimal('total_price', 10, 2);
            table.string('category', 100);
            table.decimal('tax_amount', 10, 2);
        });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema
        .dropTableIfExists('receipt_items')
        .dropTableIfExists('receipts')
        .dropTableIfExists('businesses')
        .dropTableIfExists('users');
};
