'use strict';
const BaseRepository = require('../../shared/base/BaseRepository');

/**
 * CategoriesRepository — manages the `categories` table.
 * Extends BaseRepository (Inheritance), overriding methods where domain logic differs.
 */
class CategoriesRepository extends BaseRepository {
  constructor() {
    super('categories');
  }

  /** @override — enriches results with transaction stats via a sub-query join. */
  findAllByUser(userId, includeInactive = false) {
    return this.db('categories as c')
      .leftJoin(
        this.db('transactions')
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
        this.db.raw('COALESCE(t.transaction_count, 0)::integer AS transaction_count'),
        this.db.raw('COALESCE(t.total_amount, 0)::bigint AS total_amount')
      )
      .orderBy('c.type')
      .orderBy('c.name');
  }

  findByNameTypeUser(name, type, userId) {
    return this.db('categories')
      .where({ name, type, user_id: userId })
      .whereNot('is_active', false)
      .first();
  }

  async softDelete(id, userId) {
    const [category] = await this.db('categories')
      .where({ id, user_id: userId })
      .update({ is_active: false, updated_at: this.db.fn.now() })
      .returning('*');
    return category;
  }

  mergeInto(sourceId, targetId, userId) {
    return this.db.transaction(async (trx) => {
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
}

module.exports = new CategoriesRepository();
