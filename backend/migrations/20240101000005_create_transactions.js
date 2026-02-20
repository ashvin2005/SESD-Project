'use strict';

exports.up = async function (knex) {
  await knex.schema.createTable('transactions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table
      .uuid('category_id')
      .nullable()
      .references('id')
      .inTable('categories')
      .onDelete('SET NULL'); 
    table.uuid('receipt_id').nullable().references('id').inTable('receipts').onDelete('SET NULL');
    table.string('type', 7).notNullable(); 

    table.bigInteger('amount').notNullable();
    table.string('currency', 3).notNullable().defaultTo('INR');

    table.bigInteger('amount_in_base').nullable();
    table.decimal('exchange_rate', 12, 6).nullable();
    table.string('description', 500).notNullable();
    table.text('notes').nullable();
    table.date('transaction_date').notNullable();
    table.boolean('is_recurring').notNullable().defaultTo(false);

    table.specificType('tags', 'TEXT[]').notNullable().defaultTo('{}');

    table.string('source_hash', 64).nullable();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  await knex.raw(`ALTER TABLE transactions ADD CONSTRAINT transactions_type_check CHECK (type IN ('income', 'expense'))`);


  await knex.raw(`
    CREATE UNIQUE INDEX idx_transactions_source_hash_unique
    ON transactions(user_id, source_hash)
    WHERE source_hash IS NOT NULL
  `);


  await knex.raw(`CREATE INDEX idx_transactions_user_date ON transactions(user_id, transaction_date DESC)`);
  await knex.raw(`CREATE INDEX idx_transactions_user_category ON transactions(user_id, category_id)`);
  await knex.raw(`CREATE INDEX idx_transactions_user_type_date ON transactions(user_id, type, transaction_date)`);


  await knex.raw(`CREATE INDEX idx_transactions_tags ON transactions USING GIN(tags)`);


  await knex.raw(`CREATE INDEX idx_transactions_description_trgm ON transactions USING GIN(description gin_trgm_ops)`);

  await knex.raw(`
    CREATE TRIGGER transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
  `);
};

exports.down = async function (knex) {
  await knex.raw('DROP TRIGGER IF EXISTS transactions_updated_at ON transactions');
  await knex.schema.dropTableIfExists('transactions');
};
