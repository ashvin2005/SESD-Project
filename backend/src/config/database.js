'use strict';
const pg = require('pg');
const knex = require('knex');
const config = require('./index');
const logger = require('../shared/utils/logger');

// Return bigint (int8) columns as JS numbers instead of strings.
// Safe for values within Number.MAX_SAFE_INTEGER (~9 quadrillion paise).
pg.types.setTypeParser(20, Number);

const db = knex({
  client: 'pg',
  connection: {
    host: config.db.host,
    port: config.db.port,
    database: config.db.name,
    user: config.db.user,
    password: config.db.password,
    ssl: (config.db.ssl || !['localhost', '127.0.0.1'].includes(config.db.host))
      ? { rejectUnauthorized: false }
      : false,
  },
  pool: {
    min: 2,
    max: 10,

    afterCreate(conn, done) {
      conn.query('SET timezone = "UTC"', (err) => {
        done(err, conn);
      });
    },
  },
  acquireConnectionTimeout: 10000,
});


async function testConnection() {
  try {
    await db.raw('SELECT 1');
    logger.info('PostgreSQL connected successfully');
  } catch (error) {
    logger.error('PostgreSQL connection failed', { error: error.message });
    process.exit(1);
  }
}

module.exports = { db, testConnection };
