'use strict';
const { db } = require('../../config/database');

async function findAllByUser(userId, includeInactive = false) {
  return db('recurring_rules as r')
    .leftJoin('categories as c', db.raw(`(r.template->>'category_id')::uuid`), 'c.id')
    .where('r.user_id', userId)
    .modify((qb) => {
      if (!includeInactive) qb.where('r.is_active', true);
    })
    .select(
      'r.id', 'r.template', 'r.frequency', 'r.next_occurrence',
      'r.end_date', 'r.is_active', 'r.created_at', 'r.updated_at',
      'c.name as category_name', 'c.icon as category_icon', 'c.color as category_color'
    )
    .orderBy('r.created_at', 'desc');
}

async function findByIdAndUser(id, userId) {
  return db('recurring_rules').where({ id, user_id: userId }).first();
}

async function create(data) {
  const [rule] = await db('recurring_rules').insert(data).returning('*');
  return rule;
}

async function updateById(id, userId, updates) {
  const [rule] = await db('recurring_rules')
    .where({ id, user_id: userId })
    .update({ ...updates, updated_at: db.fn.now() })
    .returning('*');
  return rule;
}

async function deleteById(id, userId) {
  return db('recurring_rules').where({ id, user_id: userId }).delete();
}

module.exports = { findAllByUser, findByIdAndUser, create, updateById, deleteById };
