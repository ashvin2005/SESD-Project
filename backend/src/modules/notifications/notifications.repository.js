'use strict';
const { db } = require('../../config/database');

async function findAllByUser(userId, { unread, limit = 20, offset = 0 } = {}) {
  return db('notifications')
    .where({ user_id: userId })
    .modify((qb) => {
      if (unread) qb.where({ is_read: false });
    })
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset);
}

async function countUnread(userId) {
  const [{ count }] = await db('notifications').where({ user_id: userId, is_read: false }).count('id as count');
  return parseInt(count, 10);
}

async function create(data) {
  const [notification] = await db('notifications').insert(data).returning('*');
  return notification;
}

async function markRead(id, userId) {
  const [notification] = await db('notifications')
    .where({ id, user_id: userId })
    .update({ is_read: true })
    .returning('*');
  return notification;
}

async function markAllRead(userId) {
  return db('notifications').where({ user_id: userId, is_read: false }).update({ is_read: true });
}

async function deleteById(id, userId) {
  return db('notifications').where({ id, user_id: userId }).delete();
}

async function deleteAllByUser(userId) {
  return db('notifications').where({ user_id: userId }).delete();
}

async function markSentViaEmail(id) {
  return db('notifications').where({ id }).update({ sent_via_email: true });
}


async function hasBudgetAlertToday(userId, budgetId) {
  const today = new Date().toISOString().split('T')[0];
  const row = await db('notifications')
    .where({ user_id: userId })
    .whereIn('type', ['budget_warning', 'budget_exceeded'])
    .whereRaw(`metadata->>'budget_id' = ?`, [budgetId])
    .whereRaw(`DATE(created_at) = ?`, [today])
    .first();
  return !!row;
}

module.exports = {
  findAllByUser,
  countUnread,
  create,
  markRead,
  markAllRead,
  markSentViaEmail,
  deleteById,
  deleteAllByUser,
  hasBudgetAlertToday,
};
