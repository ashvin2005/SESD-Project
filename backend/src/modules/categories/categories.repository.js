'use strict';
const { db } = require('../../config/database');

async function findAllByUser(userId, includeInactive = false) {
  return db('categories as c')
    .leftJoin(
      db('transactions')
        .select('category_id')
        .count('* as transaction_count')
        .sum('amount as total_amount')
        .where('user_id', userId)
        .groupBy('category_id')
        .as('t'),
      'c.id',
      't.category_id'
    )
    .where('c.user_id', userId)
    .modify((qb) => {
      if (!includeInactive) qb.where('c.is_active', true);
    })
    .select(
      'c.id',
      'c.name',
      'c.type',
      'c.icon',
      'c.color',
      'c.is_default',
      'c.is_active',
      'c.created_at',
      db.raw('COALESCE(t.transaction_count, 0)::integer AS transaction_count'),
      db.raw('COALESCE(t.total_amount, 0)::bigint AS total_amount')
    )
    .orderBy('c.type')
    .orderBy('c.name');
}

async function findByIdAndUser(id, userId) {
  return db('categories').where({ id, user_id: userId }).first();
}

async function findByNameTypeUser(name, type, userId) {
  return db('categories')
    .where({ name, type, user_id: userId })
    .whereNot('is_active', false)
    .first();
}

async function create(data) {
  const [category] = await db('categories').insert(data).returning('*');
  return category;
}

async function updateById(id, userId, updates) {
  const [category] = await db('categories')
    .where({ id, user_id: userId })
    .update({ ...updates, updated_at: db.fn.now() })
    .returning('*');
  return category;
}

async function softDelete(id, userId) {
  const [category] = await db('categories')
    .where({ id, user_id: userId })
    .update({ is_active: false, updated_at: db.fn.now() })
    .returning('*');
  return category;
}


async function mergeInto(sourceId, targetId, userId) {
  return db.transaction(async (trx) => {
    await trx('transactions')
      .where({ category_id: sourceId, user_id: userId })
      .update({ category_id: targetId, updated_at: trx.fn.now() });

    const [deleted] = await trx('categories')
      .where({ id: sourceId, user_id: userId })
      .update({ is_active: false, updated_at: trx.fn.now() })
      .returning('*');

    return deleted;
  });
}

module.exports = {
  findAllByUser,
  findByIdAndUser,
  findByNameTypeUser,
  create,
  updateById,
  softDelete,
  mergeInto,
};
