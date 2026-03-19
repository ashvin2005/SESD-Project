'use strict';
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

let counter = 0;
function uid() { return ++counter; }

async function createUser(db, overrides = {}) {
  const n = uid();
  const passwordHash = await bcrypt.hash('Password1234!', 10);
  const [user] = await db('users').insert({
    email: overrides.email || `user${n}@test.com`,
    password_hash: overrides.password_hash !== undefined ? overrides.password_hash : passwordHash,
    name: overrides.name || `Test User ${n}`,
    auth_provider: overrides.auth_provider || 'local',
    base_currency: overrides.base_currency || 'INR',
    email_verified: overrides.email_verified !== undefined ? overrides.email_verified : true,
  }).returning('*');

  await db('user_preferences').insert({ user_id: user.id });

  return user;
}

function createToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET || 'test_jwt_secret_32_chars_minimum!', { expiresIn: '7d' });
}

async function createCategory(db, userId, overrides = {}) {
  const n = uid();
  const [category] = await db('categories').insert({
    user_id: userId,
    name: overrides.name || `Category ${n}`,
    type: overrides.type || 'expense',
    icon: overrides.icon || '📦',
    color: overrides.color || '#9ca3af',
    is_default: overrides.is_default || false,
    is_active: overrides.is_active !== undefined ? overrides.is_active : true,
  }).returning('*');
  return category;
}

async function createTransaction(db, userId, categoryId, overrides = {}) {
  const [tx] = await db('transactions').insert({
    user_id: userId,
    category_id: categoryId || null,
    type: overrides.type || 'expense',
    amount: overrides.amount !== undefined ? overrides.amount : 50000,
    currency: overrides.currency || 'INR',
    amount_in_base: overrides.amount_in_base !== undefined ? overrides.amount_in_base : (overrides.amount || 50000),
    exchange_rate: 1,
    description: overrides.description || 'Test transaction',
    transaction_date: overrides.transaction_date || new Date().toISOString().split('T')[0],
    tags: overrides.tags || [],
  }).returning('*');
  return tx;
}

async function createBudget(db, userId, categoryId, overrides = {}) {
  const [budget] = await db('budgets').insert({
    user_id: userId,
    category_id: categoryId || null,
    amount: overrides.amount || 500000,
    currency: 'INR',
    period: overrides.period || 'monthly',
    start_date: overrides.start_date || new Date().toISOString().split('T')[0],
    alert_threshold: overrides.alert_threshold || 80,
  }).returning('*');
  return budget;
}

async function createInvestment(db, userId, overrides = {}) {
  const n = uid();
  const [investment] = await db('investments').insert({
    user_id: userId,
    type: overrides.type || 'stock',
    name: overrides.name || `Investment ${n}`,
    symbol: overrides.symbol || `SYM${n}`,
    quantity: overrides.quantity !== undefined ? overrides.quantity : 10,
    buy_price: overrides.buy_price !== undefined ? overrides.buy_price : 500,
    current_price: overrides.current_price !== undefined ? overrides.current_price : null,
    currency: overrides.currency || 'INR',
    investment_date: overrides.investment_date || new Date().toISOString().split('T')[0],
    notes: overrides.notes || null,
  }).returning('*');
  return investment;
}

module.exports = { createUser, createToken, createCategory, createTransaction, createBudget, createInvestment };
