'use strict';
const BaseRepository = require('../../shared/base/BaseRepository');

/**
 * NotificationsRepository — manages the `notifications` table.
 * Extends BaseRepository (Inheritance) with read/email tracking methods.
 */
class NotificationsRepository extends BaseRepository {
  constructor() {
    super('notifications');
  }

  /** @override — supports unread filter, limit and offset. */
  findAllByUser(userId, { unread, limit = 20, offset = 0 } = {}) {
    return this.db('notifications')
      .where({ user_id: userId })
      .modify((qb) => {
        if (unread) qb.where({ is_read: false });
      })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
  }

  async countUnread(userId) {
    const [{ count }] = await this.db('notifications')
      .where({ user_id: userId, is_read: false })
      .count('id as count');
    return parseInt(count, 10);
  }

  async markRead(id, userId) {
    const [notification] = await this.db('notifications')
      .where({ id, user_id: userId })
      .update({ is_read: true })
      .returning('*');
    return notification;
  }

  markAllRead(userId) {
    return this.db('notifications')
      .where({ user_id: userId, is_read: false })
      .update({ is_read: true });
  }

  deleteAllByUser(userId) {
    return this.db('notifications').where({ user_id: userId }).delete();
  }

  markSentViaEmail(id) {
    return this.db('notifications').where({ id }).update({ sent_via_email: true });
  }

  async hasBudgetAlertToday(userId, budgetId) {
    const today = new Date().toISOString().split('T')[0];
    const row = await this.db('notifications')
      .where({ user_id: userId })
      .whereIn('type', ['budget_warning', 'budget_exceeded'])
      .whereRaw(`metadata->>'budget_id' = ?`, [budgetId])
      .whereRaw(`DATE(created_at) = ?`, [today])
      .first();
    return !!row;
  }
}

module.exports = new NotificationsRepository();
