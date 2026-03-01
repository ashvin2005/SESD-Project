'use strict';
const { db } = require('../../config/database');

async function findAllByUser(userId, includeInactive = false) {
  return db('budgets as b')
    .leftJoin('categories as c', 'b.category_id', 'c.id')
    .where('b.user_id', userId)
    .modify((qb) => {
      if (!includeInactive) qb.where('b.is_active', true);
    })
    .select(
      'b.id', 'b.amount', 'b.currency', 'b.period', 'b.start_date',
      'b.alert_threshold', 'b.is_active', 'b.created_at', 'b.updated_at',
      'b.category_id',
      'c.name as category_name',
      'c.icon as category_icon',
      'c.color as category_color'
    )
    .orderBy('b.created_at', 'desc');
}

async function findByIdAndUser(id, userId) {
  return db('budgets as b')
    .leftJoin('categories as c', 'b.category_id', 'c.id')
    .where({ 'b.id': id, 'b.user_id': userId })
    .select('b.*', 'c.name as category_name', 'c.icon as category_icon', 'c.color as category_color')
    .first();
}

async function findActiveDuplicate(userId, categoryId, period, excludeId = null) {
  const query = db('budgets')
    .where({ user_id: userId, period, is_active: true })
    .where(function () {
      if (categoryId) {
        this.where('category_id', categoryId);
      } else {
        this.whereNull('category_id');
      }
    });

  if (excludeId) query.whereNot('id', excludeId);
  return query.first();
}

async function create(data) {
  const [budget] = await db('budgets').insert(data).returning('*');
  return budget;
}

async function updateById(id, userId, updates) {
  const [budget] = await db('budgets')
    .where({ id, user_id: userId })
    .update({ ...updates, updated_at: db.fn.now() })
    .returning('*');
  return budget;
}

async function deleteById(id, userId) {
  return db('budgets').where({ id, user_id: userId }).delete();
}


async function findAllWithProgress(userId, periodBounds) {
  const rows = await db.raw(
    `
    SELECT
      b.id,
      b.amount AS budget_amount,
      b.currency,
      b.period,
      b.start_date,
      b.alert_threshold,
      b.category_id,
      c.name AS category_name,
      c.icon AS category_icon,
      c.color AS category_color,
      COALESCE(SUM(ABS(t.amount_in_base)), 0)::bigint AS spent
    FROM budgets b
    LEFT JOIN categories c ON b.category_id = c.id
    LEFT JOIN transactions t
      ON t.user_id = b.user_id
      AND (b.category_id IS NULL OR t.category_id = b.category_id)
      AND t.type = 'expense'
      AND t.transaction_date BETWEEN :date_from AND :date_to
    WHERE b.user_id = :userId
      AND b.is_active = true
    GROUP BY b.id, c.name, c.icon, c.color
    ORDER BY b.created_at DESC
    `,
    { userId, date_from: periodBounds.start, date_to: periodBounds.end }
  );

  return rows.rows;
}

module.exports = {
  findAllByUser,
  findByIdAndUser,
  findActiveDuplicate,
  create,
  updateById,
  deleteById,
  findAllWithProgress,
};
