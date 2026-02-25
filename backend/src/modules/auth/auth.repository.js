'use strict';
const { db } = require('../../config/database');

async function findByEmail(email) {
  return db('users').where({ email: email.toLowerCase() }).first();
}

async function findById(id) {
  return db('users')
    .where({ id })
    .select('id', 'email', 'name', 'auth_provider', 'google_id', 'avatar_url', 'email_verified', 'base_currency', 'created_at')
    .first();
}

async function findByGoogleId(googleId) {
  return db('users').where({ google_id: googleId }).first();
}

async function create(userData) {
  return db.transaction(async (trx) => {
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

async function updateById(id, updates) {
  const [user] = await db('users')
    .where({ id })
    .update({ ...updates, updated_at: db.fn.now() })
    .returning(['id', 'email', 'name', 'auth_provider', 'avatar_url', 'email_verified', 'base_currency']);
  return user;
}

async function linkGoogleAccount(userId, googleId, avatarUrl) {
  return updateById(userId, {
    google_id: googleId,
    auth_provider: 'google',
    avatar_url: avatarUrl,
    email_verified: true,
  });
}

module.exports = { findByEmail, findById, findByGoogleId, create, updateById, linkGoogleAccount };
