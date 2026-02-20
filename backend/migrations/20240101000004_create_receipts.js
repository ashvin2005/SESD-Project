'use strict';

exports.up = async function (knex) {

  await knex.schema.createTable('receipts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.text('file_path').notNullable();
    table.string('file_name', 255).notNullable();
    table.string('mime_type', 100).notNullable();
    table.integer('file_size').notNullable(); 
    table.text('thumbnail_path').nullable(); 
    table.timestamp('uploaded_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  await knex.raw(`CREATE INDEX idx_receipts_user ON receipts(user_id)`);
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('receipts');
};
