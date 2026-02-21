'use strict';

exports.up = async function (knex) {
  await knex.schema.createTable('investments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('type', 20).notNullable();
    table.string('name', 200).notNullable();
    table.string('symbol', 50).nullable();
    table.decimal('quantity', 18, 8).notNullable();
    table.decimal('buy_price', 18, 4).notNullable();
    table.decimal('current_price', 18, 4).nullable();
    table.string('currency', 3).notNullable().defaultTo('INR');
    table.date('investment_date').notNullable();
    table.text('notes').nullable();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  await knex.raw(
    `ALTER TABLE investments ADD CONSTRAINT investments_type_check CHECK (type IN ('stock', 'mutual_fund', 'crypto'))`
  );

  await knex.raw(`CREATE INDEX idx_investments_user_id ON investments(user_id)`);
  await knex.raw(`CREATE INDEX idx_investments_user_type ON investments(user_id, type)`);

  await knex.raw(`
    CREATE TRIGGER investments_updated_at
    BEFORE UPDATE ON investments
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
  `);
};

exports.down = async function (knex) {
  await knex.raw('DROP TRIGGER IF EXISTS investments_updated_at ON investments');
  await knex.schema.dropTableIfExists('investments');
};
