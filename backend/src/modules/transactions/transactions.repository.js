'use strict';
const BaseRepository = require('../../shared/base/BaseRepository');

/**
 * TransactionsRepository — manages the `transactions` table.
 * Extends BaseRepository (Inheritance) with cursor-based pagination and bulk operations.
 */
class TransactionsRepository extends BaseRepository {
  constructor() {
    super('transactions');
  }

  /** Builds a filtered, joined query shared by findAll and countAll. */
  _buildFilteredQuery(userId, filters) {
    const query = this.db('transactions as t')
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
      query.where('t.amount', '>=', Math.round(filters.min_amount * 100));
    }
    if (filters.max_amount !== undefined) {
      query.where('t.amount', '<=', Math.round(filters.max_amount * 100));
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

  async findAll(userId, filters, limit, cursor) {
    const query = this._buildFilteredQuery(userId, filters);

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

  async countAll(userId, filters) {
    const query = this._buildFilteredQuery(userId, filters);
    const [{ count }] = await query.clearSelect().count('t.id as count');
    return parseInt(count, 10);
  }

  /** @override — includes category join for richer output. */
  findByIdAndUser(id, userId) {
    return this.db('transactions as t')
      .leftJoin('categories as c', 't.category_id', 'c.id')
      .where({ 't.id': id, 't.user_id': userId })
      .select('t.*', 'c.name as category_name', 'c.icon as category_icon', 'c.color as category_color')
      .first();
  }

  bulkDelete(ids, userId) {
    return this.db('transactions').whereIn('id', ids).where('user_id', userId).delete();
  }

  bulkRecategorize(ids, userId, categoryId) {
    return this.db('transactions')
      .whereIn('id', ids)
      .where('user_id', userId)
      .update({ category_id: categoryId, updated_at: this.db.fn.now() });
  }

  findDuplicate(userId, sourceHash) {
    return this.db('transactions').where({ user_id: userId, source_hash: sourceHash }).first();
  }
}

module.exports = new TransactionsRepository();
