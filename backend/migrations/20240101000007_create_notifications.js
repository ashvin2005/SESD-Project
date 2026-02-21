'use strict';

exports.up = async function (knex) {
  await knex.schema.createTable('notifications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('type', 30).notNullable();
    table.string('title', 200).notNullable();
    table.text('message').notNullable();
    table.boolean('is_read').notNullable().defaultTo(false);
    table.jsonb('metadata').nullable(); // flexible payload
    table.boolean('sent_via_email').notNullable().defaultTo(false);
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  await knex.raw(`CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC)`);
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('notifications');
};
