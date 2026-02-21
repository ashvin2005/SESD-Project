'use strict';

exports.up = async function (knex) {
  await knex.schema.createTable('exchange_rates', (table) => {
    table.increments('id').primary();
    table.string('base_currency', 3).notNullable();
    table.string('target_currency', 3).notNullable();
    table.decimal('rate', 12, 6).notNullable();
    table.timestamp('fetched_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

  });

  await knex.raw(`CREATE UNIQUE INDEX idx_exchange_rates_unique ON exchange_rates(base_currency, target_currency)`);
  await knex.raw(`CREATE INDEX idx_exchange_rates_lookup ON exchange_rates(base_currency, target_currency, fetched_at DESC)`);
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('exchange_rates');
};
