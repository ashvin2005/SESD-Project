'use strict';

exports.up = async function (knex) {
  await knex.schema.createTable('recurring_rules', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.jsonb('template').notNullable();
    table.string('frequency', 10).notNullable();
    table.date('next_occurrence').notNullable();
    table.date('end_date').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  await knex.raw(`ALTER TABLE recurring_rules ADD CONSTRAINT recurring_rules_frequency_check CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly'))`);
  await knex.raw(`CREATE INDEX idx_recurring_rules_due ON recurring_rules(user_id, next_occurrence) WHERE is_active = true`);

  await knex.raw(`
    CREATE TRIGGER recurring_rules_updated_at
    BEFORE UPDATE ON recurring_rules
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
  `);
};

exports.down = async function (knex) {
  await knex.raw('DROP TRIGGER IF EXISTS recurring_rules_updated_at ON recurring_rules');
  await knex.schema.dropTableIfExists('recurring_rules');
};
