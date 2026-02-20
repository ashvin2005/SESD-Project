'use strict';

exports.up = async function (knex) {
  await knex.schema.createTable('categories', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('name', 50).notNullable();
    table.string('type', 7).notNullable(); 
    table.string('icon', 50).nullable();
    table.string('color', 7).nullable(); 
    table.boolean('is_default').notNullable().defaultTo(false);
    table.boolean('is_active').notNullable().defaultTo(true); 
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());


    table.unique(['user_id', 'name', 'type']);
  });

  await knex.raw(`ALTER TABLE categories ADD CONSTRAINT categories_type_check CHECK (type IN ('income', 'expense'))`);

  await knex.raw(`
    CREATE TRIGGER categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
  `);


  await knex.raw(`CREATE INDEX idx_categories_user_active ON categories(user_id, is_active)`);
  await knex.raw(`CREATE INDEX idx_categories_user_type ON categories(user_id, type)`);
};

exports.down = async function (knex) {
  await knex.raw('DROP TRIGGER IF EXISTS categories_updated_at ON categories');
  await knex.schema.dropTableIfExists('categories');
};
