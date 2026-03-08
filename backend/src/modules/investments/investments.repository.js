'use strict';
const { db } = require('../../config/database');

async function findAllByUser(userId) {
  return db('investments')
    .where({ user_id: userId })
    .select('*')
    .orderBy('investment_date', 'desc');
}

async function findByIdAndUser(id, userId) {
  return db('investments').where({ id, user_id: userId }).first();
}

async function create(data) {
  const [investment] = await db('investments').insert(data).returning('*');
  return investment;
}

async function updateById(id, userId, updates) {
  const [investment] = await db('investments')
    .where({ id, user_id: userId })
    .update({ ...updates, updated_at: db.fn.now() })
    .returning('*');
  return investment;
}

async function deleteById(id, userId) {
  return db('investments').where({ id, user_id: userId }).delete();
}

module.exports = { findAllByUser, findByIdAndUser, create, updateById, deleteById };
