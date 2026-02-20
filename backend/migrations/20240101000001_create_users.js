'use strict';

exports.up = async function (knex) {

  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pg_trgm"');

  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email', 255).notNullable().unique();
    table.string('password_hash', 255).nullable();
    table.string('name', 100).notNullable();
    table.string('auth_provider', 20).notNullable().defaultTo('local');
    table.string('google_id', 255).nullable().unique();
    table.text('avatar_url').nullable();
    table.boolean('email_verified').notNullable().defaultTo(false);
    table.string('base_currency', 3).notNullable().defaultTo('INR');
    table.timestamps(true, true); 
  });


  await knex.raw(`ALTER TABLE users ADD CONSTRAINT users_email_lowercase CHECK (email = LOWER(email))`);


  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  await knex.raw(`
    CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
  `);
};

exports.down = async function (knex) {
  await knex.raw('DROP TRIGGER IF EXISTS users_updated_at ON users');
  await knex.schema.dropTableIfExists('users');
};
