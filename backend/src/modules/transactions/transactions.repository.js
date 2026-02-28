'use strict';
const { db } = require('../../config/database');


function buildFilteredQuery(userId, filters) {
  const query = db('transactions as t')
    .leftJoin('categories as c', 't.category_id', 'c.id')
    .where('t.user_id', userId)
    .select(
      't.id', 't.type', 't.amount', 't.currency', 't.amount_in_base', 't.exchange_rate',
      't.description', 't.notes', 't.transaction_date', 't.is_recurring', 't.tags',
      't.receipt_id', 't.source_hash', 't.created_at', 't.updated_at',
      'c.id as category_id', 'c.name as category_name', 'c.icon as category_icon', 'c.color as category_color'
    );

  if (filters.type) query.where('t.type', filters.type);
  if (filters.category_id) query.where('t.category_id', filters.category_id);
  if (filters.currency) query.where('t.currency', filters.currency);
  if (filters.date_from) query.where('t.transaction_date', '>=', filters.date_from);
  if (filters.date_to) query.where('t.transaction_date', '<=', filters.date_to);


  if (filters.min_amount !== undefined) {
    const minSmallest = Math.round(filters.min_amount * 100);
    query.where('t.amount', '>=', minSmallest);
  }
  if (filters.max_amount !== undefined) {
    const maxSmallest = Math.round(filters.max_amount * 100);
    query.where('t.amount', '<=', maxSmallest);
  }


  if (filters.search) {
    query.whereRaw(`t.description ILIKE ?`, [`%${filters.search}%`]);
  }


  if (filters.tags) {
    const tags = Array.isArray(filters.tags) ? filters.tags : [filters.tags];
    query.whereRaw(`t.tags && ?::TEXT[]`, [tags]);
  }

  return query;
}

async function findAll(userId, filters, limit, cursor) {
  const query = buildFilteredQuery(userId, filters);


  if (cursor) {
    const decoded = Buffer.from(cursor, 'base64').toString('utf8');
    const [cursorDate, cursorId] = decoded.split('|');
    query.where(function () {
      this.where('t.transaction_date', '<', cursorDate)
        .orWhere(function () {
          this.where('t.transaction_date', cursorDate).andWhere('t.id', '<', cursorId);
        });
    });
  }


  const sortMap = {
    'transaction_date': ['t.transaction_date', 'asc'],
    '-transaction_date': ['t.transaction_date', 'desc'],
    'amount': ['t.amount', 'asc'],
    '-amount': ['t.amount', 'desc'],
    'created_at': ['t.created_at', 'asc'],
    '-created_at': ['t.created_at', 'desc'],
  };
  const [sortCol, sortDir] = sortMap[filters.sort || '-transaction_date'];
  query.orderBy(sortCol, sortDir).orderBy('t.id', 'desc');

  const rows = await query.limit(limit + 1); 

  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;

  let nextCursor = null;
  if (hasMore) {
    const last = data[data.length - 1];
    nextCursor = Buffer.from(`${last.transaction_date}|${last.id}`).toString('base64');
  }

  return { data, nextCursor };
}

async function countAll(userId, filters) {
  const query = buildFilteredQuery(userId, filters);
  const [{ count }] = await query.clearSelect().count('t.id as count');
  return parseInt(count, 10);
}

async function findByIdAndUser(id, userId) {
  return db('transactions as t')
    .leftJoin('categories as c', 't.category_id', 'c.id')
    .where({ 't.id': id, 't.user_id': userId })
    .select(
      't.*',
      'c.name as category_name',
      'c.icon as category_icon',
      'c.color as category_color'
    )
    .first();
}

async function create(data) {
  const [transaction] = await db('transactions').insert(data).returning('*');
  return transaction;
}

async function updateById(id, userId, updates) {
  const [transaction] = await db('transactions')
    .where({ id, user_id: userId })
    .update({ ...updates, updated_at: db.fn.now() })
    .returning('*');
  return transaction;
}

async function deleteById(id, userId) {
  return db('transactions').where({ id, user_id: userId }).delete();
}

async function bulkDelete(ids, userId) {
  return db('transactions').whereIn('id', ids).where('user_id', userId).delete();
}

async function bulkRecategorize(ids, userId, categoryId) {
  return db('transactions')
    .whereIn('id', ids)
    .where('user_id', userId)
    .update({ category_id: categoryId, updated_at: db.fn.now() });
}

async function findDuplicate(userId, sourceHash) {
  return db('transactions').where({ user_id: userId, source_hash: sourceHash }).first();
}

module.exports = {
  findAll, countAll, findByIdAndUser, create, updateById,
  deleteById, bulkDelete, bulkRecategorize, findDuplicate,
};
