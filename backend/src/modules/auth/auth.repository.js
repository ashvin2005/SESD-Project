'use strict';
const BaseRepository = require('../../shared/base/BaseRepository');

/**
 * AuthRepository — manages the `users` table.
 * Extends BaseRepository (Inheritance) and adds auth-specific queries.
 */
class AuthRepository extends BaseRepository {
  constructor() {
    super('users');
  }

  findByEmail(email) {
    return this.db('users').where({ email: email.toLowerCase() }).first();
  }

  /** @override — selects only safe (non-sensitive) columns. */
  findById(id) {
    return this.db('users')
      .where({ id })
      .select('id', 'email', 'name', 'auth_provider', 'google_id', 'avatar_url', 'email_verified', 'base_currency', 'created_at')
      .first();
  }

  findByGoogleId(googleId) {
    return this.db('users').where({ google_id: googleId }).first();
  }

  /**
   * @override — uses a transaction to atomically create user + preferences + default categories.
   */
  create(userData) {
    return this.db.transaction(async (trx) => {
      const [user] = await trx('users')
        .insert({
          email: userData.email.toLowerCase(),
          password_hash: userData.password_hash || null,
          name: userData.name,
          auth_provider: userData.auth_provider || 'local',
          google_id: userData.google_id || null,
          avatar_url: userData.avatar_url || null,
          email_verified: userData.email_verified || false,
          base_currency: userData.base_currency || 'INR',
        })
        .returning(['id', 'email', 'name', 'auth_provider', 'base_currency', 'created_at']);

      await trx('user_preferences').insert({ user_id: user.id });

      const { DEFAULT_CATEGORIES } = require('../../config/constants');
      const categories = DEFAULT_CATEGORIES.map((cat) => ({
        ...cat,
        user_id: user.id,
      }));
      await trx('categories').insert(categories);

      return user;
    });
  }

  /** @override — users table has no user_id FK; key is just `id`. */
  async updateById(id, updates) {
    const [user] = await this.db('users')
      .where({ id })
      .update({ ...updates, updated_at: this.db.fn.now() })
      .returning(['id', 'email', 'name', 'auth_provider', 'avatar_url', 'email_verified', 'base_currency']);
    return user;
  }

  linkGoogleAccount(userId, googleId, avatarUrl) {
    return this.updateById(userId, {
      google_id: googleId,
      auth_provider: 'google',
      avatar_url: avatarUrl,
      email_verified: true,
    });
  }
}

module.exports = new AuthRepository();
