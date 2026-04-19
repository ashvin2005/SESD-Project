'use strict';

/**
 * BaseRepository — Abstract base class for all data-access repositories.
 *
 * OOP Principles demonstrated:
 *  - Encapsulation  : all DB access is encapsulated inside the class
 *  - Abstraction    : consumers only interact with high-level methods
 *  - Inheritance    : concrete repositories extend this class
 *  - Polymorphism   : subclasses override methods as needed
 */
class BaseRepository {
  /**
   * @param {string} tableName  The Knex table name this repository operates on.
   */
  constructor(tableName) {
    if (!tableName) throw new Error('BaseRepository requires a tableName');
    this.tableName = tableName;
  }

  /** Lazy getter so circular-dependency with database.js is avoided. */
  get db() {
    return require('../../config/database').db;
  }

  /**
   * Find a single record by primary key.
   * @param {number|string} id
   * @returns {Promise<object|undefined>}
   */
  findById(id) {
    return this.db(this.tableName).where({ id }).first();
  }

  /**
   * Find a single record owned by a specific user.
   * @param {number|string} id
   * @param {number|string} userId
   * @returns {Promise<object|undefined>}
   */
  findByIdAndUser(id, userId) {
    return this.db(this.tableName).where({ id, user_id: userId }).first();
  }

  /**
   * Insert a new record and return it.
   * @param {object} data
   * @returns {Promise<object>}
   */
  async create(data) {
    const [row] = await this.db(this.tableName).insert(data).returning('*');
    return row;
  }

  /**
   * Update a record owned by a user and return the updated row.
   * @param {number|string} id
   * @param {number|string} userId
   * @param {object} updates
   * @returns {Promise<object>}
   */
  async updateById(id, userId, updates) {
    const [row] = await this.db(this.tableName)
      .where({ id, user_id: userId })
      .update({ ...updates, updated_at: this.db.fn.now() })
      .returning('*');
    return row;
  }

  /**
   * Delete a record owned by a user.
   * @param {number|string} id
   * @param {number|string} userId
   * @returns {Promise<number>} Number of rows deleted.
   */
  deleteById(id, userId) {
    return this.db(this.tableName).where({ id, user_id: userId }).delete();
  }

  /**
   * Find all records belonging to a user.
   * Subclasses may override to add joins, filters, ordering, etc.
   * @param {number|string} userId
   * @returns {Promise<object[]>}
   */
  findAllByUser(userId) {
    return this.db(this.tableName).where({ user_id: userId });
  }
}

module.exports = BaseRepository;
