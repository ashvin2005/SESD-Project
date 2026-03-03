'use strict';
const { db } = require('../../config/database');

async function create(data) {
  const [receipt] = await db('receipts').insert(data).returning('*');
  return receipt;
}

async function findByIdAndUser(id, userId) {
  return db('receipts').where({ id, user_id: userId }).first();
}

async function findAllByUser(userId) {
  return db('receipts').where({ user_id: userId }).orderBy('uploaded_at', 'desc');
}

async function deleteById(id, userId) {
  const [receipt] = await db('receipts').where({ id, user_id: userId }).delete().returning('*');
  return receipt;
}

module.exports = { create, findByIdAndUser, findAllByUser, deleteById };
