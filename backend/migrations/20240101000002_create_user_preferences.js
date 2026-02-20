'use strict';

exports.up = async function (knex) {
  await knex.schema.createTable('user_preferences', (table) => {
    table.uuid('user_id').primary().references('id').inTable('users').onDelete('CASCADE');
    table.boolean('notifications_enabled').notNullable().defaultTo(true);
    table.boolean('email_notifications').notNullable().defaultTo(true);
    table.string('dashboard_default_range', 10).notNullable().defaultTo('month');
    table.string('theme', 10).notNullable().defaultTo('light');
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  await knex.raw(`
    CREATE TRIGGER user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
  `);
};

exports.down = async function (knex) {
  await knex.raw('DROP TRIGGER IF EXISTS user_preferences_updated_at ON user_preferences');
  await knex.schema.dropTableIfExists('user_preferences');
};
