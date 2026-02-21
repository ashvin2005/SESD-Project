'use strict';

exports.up = async function (knex) {
  await knex.schema.createTable('budgets', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('category_id').nullable().references('id').inTable('categories').onDelete('SET NULL');
    table.bigInteger('amount').notNullable(); 
    table.string('currency', 3).notNullable().defaultTo('INR');
    table.string('period', 10).notNullable(); 
    table.date('start_date').notNullable();
    table.integer('alert_threshold').notNullable().defaultTo(80);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  await knex.raw(`ALTER TABLE budgets ADD CONSTRAINT budgets_period_check CHECK (period IN ('weekly', 'monthly', 'yearly'))`);
  await knex.raw(`ALTER TABLE budgets ADD CONSTRAINT budgets_amount_positive CHECK (amount > 0)`);
  await knex.raw(`ALTER TABLE budgets ADD CONSTRAINT budgets_threshold_range CHECK (alert_threshold BETWEEN 1 AND 100)`);


  await knex.raw(`
    CREATE UNIQUE INDEX idx_budgets_unique_active
    ON budgets(user_id, COALESCE(category_id, '00000000-0000-0000-0000-000000000000'::uuid), period)
    WHERE is_active = true
  `);

  await knex.raw(`CREATE INDEX idx_budgets_user ON budgets(user_id, is_active)`);

  await knex.raw(`
    CREATE TRIGGER budgets_updated_at
    BEFORE UPDATE ON budgets
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
  `);
};

exports.down = async function (knex) {
  await knex.raw('DROP TRIGGER IF EXISTS budgets_updated_at ON budgets');
  await knex.schema.dropTableIfExists('budgets');
};
