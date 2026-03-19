'use strict';
const knex = require('knex');
const knexConfig = require('../../knexfile');

let db;

function getTestDb() {
  if (!db) {
    db = knex(knexConfig.test);
  }
  return db;
}

async function setupTestDb() {
  const testDb = getTestDb();
  await testDb.migrate.latest();
  return testDb;
}

async function teardownTestDb() {
  const testDb = getTestDb();
  await testDb.destroy();
  db = null;
}

async function truncateAll(testDb) {
  await testDb.raw(
    `TRUNCATE TABLE investments, notifications, recurring_rules, transactions, receipts, budgets, categories, user_preferences, users RESTART IDENTITY CASCADE`
  );
}

module.exports = { getTestDb, setupTestDb, teardownTestDb, truncateAll };
