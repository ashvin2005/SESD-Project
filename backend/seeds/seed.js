'use strict';
const bcrypt = require('bcryptjs');

const DEMO_EMAIL = 'demo@financetracker.com';
const DEMO_PASSWORD = 'Demo@1234';

exports.seed = async function (knex) {

  await knex('users').where({ email: DEMO_EMAIL }).delete();


  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const [user] = await knex('users')
    .insert({
      email: DEMO_EMAIL,
      password_hash: passwordHash,
      name: 'Demo User',
      auth_provider: 'local',
      base_currency: 'INR',
      email_verified: true,
    })
    .returning(['id']);

  const userId = user.id;


  await knex('user_preferences').insert({ user_id: userId });


  const DEFAULT_CATEGORIES = [
    { name: 'Salary', type: 'income', icon: '💼', color: '#10b981', is_default: true },
    { name: 'Freelance', type: 'income', icon: '💻', color: '#3b82f6', is_default: true },
    { name: 'Investment Returns', type: 'income', icon: '📈', color: '#8b5cf6', is_default: true },
    { name: 'Other Income', type: 'income', icon: '💰', color: '#6b7280', is_default: true },
    { name: 'Housing & Rent', type: 'expense', icon: '🏠', color: '#ef4444', is_default: true },
    { name: 'Food & Dining', type: 'expense', icon: '🍔', color: '#f97316', is_default: true },
    { name: 'Transportation', type: 'expense', icon: '🚗', color: '#eab308', is_default: true },
    { name: 'Shopping', type: 'expense', icon: '🛍️', color: '#84cc16', is_default: true },
    { name: 'Entertainment', type: 'expense', icon: '🎬', color: '#06b6d4', is_default: true },
    { name: 'Healthcare', type: 'expense', icon: '🏥', color: '#14b8a6', is_default: true },
    { name: 'Education', type: 'expense', icon: '📚', color: '#6366f1', is_default: true },
    { name: 'Utilities', type: 'expense', icon: '💡', color: '#a855f7', is_default: true },
    { name: 'Travel', type: 'expense', icon: '✈️', color: '#f43f5e', is_default: true },
    { name: 'Subscriptions', type: 'expense', icon: '📱', color: '#34d399', is_default: true },
    { name: 'Other Expense', type: 'expense', icon: '📦', color: '#9ca3af', is_default: true },
  ];

  const categoryRows = DEFAULT_CATEGORIES.map((c) => ({ ...c, user_id: userId }));
  const insertedCategories = await knex('categories').insert(categoryRows).returning(['id', 'name', 'type']);

  const catMap = {};
  insertedCategories.forEach((c) => { catMap[c.name] = c.id; });


  const today = new Date();
  const transactions = [];

  for (let m = 5; m >= 0; m--) {
    const month = new Date(today.getFullYear(), today.getMonth() - m, 1);
    const year = month.getFullYear();
    const mon = month.getMonth();

    const makeDate = (day) => {
      const d = new Date(year, mon, Math.min(day, new Date(year, mon + 1, 0).getDate()));
      return d.toISOString().split('T')[0];
    };


    transactions.push({
      user_id: userId, category_id: catMap['Salary'], type: 'income',
      amount: 8000000, currency: 'INR', amount_in_base: 8000000,
      exchange_rate: 1, description: 'Monthly Salary', transaction_date: makeDate(1),
    });


    if (m % 2 === 0) {
      transactions.push({
        user_id: userId, category_id: catMap['Freelance'], type: 'income',
        amount: 1500000, currency: 'INR', amount_in_base: 1500000,
        exchange_rate: 1, description: 'Freelance Project Payment', transaction_date: makeDate(15),
      });
    }


    transactions.push({
      user_id: userId, category_id: catMap['Housing & Rent'], type: 'expense',
      amount: 2000000, currency: 'INR', amount_in_base: 2000000,
      exchange_rate: 1, description: 'Monthly Rent', transaction_date: makeDate(3),
    });


    [7, 14, 21, 28].forEach((day) => {
      const amt = Math.round((2000 + Math.random() * 1500) * 100);
      transactions.push({
        user_id: userId, category_id: catMap['Food & Dining'], type: 'expense',
        amount: amt, currency: 'INR', amount_in_base: amt,
        exchange_rate: 1, description: 'Groceries & Food', transaction_date: makeDate(day),
      });
    });


    transactions.push({
      user_id: userId, category_id: catMap['Utilities'], type: 'expense',
      amount: Math.round((150000 + Math.random() * 50000)), currency: 'INR', amount_in_base: Math.round((150000 + Math.random() * 50000)),
      exchange_rate: 1, description: 'Electricity & Internet Bill', transaction_date: makeDate(10),
    });


    transactions.push({
      user_id: userId, category_id: catMap['Transportation'], type: 'expense',
      amount: Math.round((80000 + Math.random() * 40000)), currency: 'INR', amount_in_base: Math.round((80000 + Math.random() * 40000)),
      exchange_rate: 1, description: 'Cab & Commute', transaction_date: makeDate(16),
    });


    transactions.push({
      user_id: userId, category_id: catMap['Subscriptions'], type: 'expense',
      amount: 79900, currency: 'INR', amount_in_base: 79900,
      exchange_rate: 1, description: 'Netflix Subscription', transaction_date: makeDate(5),
    });
    transactions.push({
      user_id: userId, category_id: catMap['Subscriptions'], type: 'expense',
      amount: 11900, currency: 'INR', amount_in_base: 11900,
      exchange_rate: 1, description: 'Spotify Premium', transaction_date: makeDate(5),
    });


    if (m < 4) {
      transactions.push({
        user_id: userId, category_id: catMap['Food & Dining'], type: 'expense',
        amount: Math.round((80000 + Math.random() * 60000)), currency: 'INR', amount_in_base: Math.round((80000 + Math.random() * 60000)),
        exchange_rate: 1, description: 'Restaurant Dinner', transaction_date: makeDate(20),
      });
    }


    if (m % 3 === 0) {
      transactions.push({
        user_id: userId, category_id: catMap['Shopping'], type: 'expense',
        amount: Math.round((200000 + Math.random() * 300000)), currency: 'INR', amount_in_base: Math.round((200000 + Math.random() * 300000)),
        exchange_rate: 1, description: 'Online Shopping', transaction_date: makeDate(18),
      });
    }


    if (m === 2) {
      transactions.push({
        user_id: userId, category_id: catMap['Healthcare'], type: 'expense',
        amount: 150000, currency: 'INR', amount_in_base: 150000,
        exchange_rate: 1, description: 'Doctor Consultation & Medicines', transaction_date: makeDate(12),
      });
    }
  }


  const chunkSize = 50;
  for (let i = 0; i < transactions.length; i += chunkSize) {
    await knex('transactions').insert(transactions.slice(i, i + chunkSize));
  }


  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  await knex('budgets').insert([
    {
      user_id: userId, category_id: catMap['Food & Dining'],
      amount: 1500000, currency: 'INR', period: 'monthly',
      start_date: thisMonthStart, alert_threshold: 80,
    },
    {
      user_id: userId, category_id: catMap['Shopping'],
      amount: 500000, currency: 'INR', period: 'monthly',
      start_date: thisMonthStart, alert_threshold: 90,
    },
    {
      user_id: userId, category_id: null,
      amount: 5000000, currency: 'INR', period: 'monthly',
      start_date: thisMonthStart, alert_threshold: 80,
    },
  ]);


  await knex('recurring_rules').insert({
    user_id: userId,
    template: JSON.stringify({
      category_id: catMap['Salary'],
      type: 'income',
      amount: 80000,
      currency: 'INR',
      description: 'Monthly Salary',
      tags: ['salary', 'income'],
    }),
    frequency: 'monthly',
    next_occurrence: new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString().split('T')[0],
    is_active: true,
  });

  console.log(`
   Demo data seeded successfully!
   Email: ${DEMO_EMAIL}
   Password: ${DEMO_PASSWORD}
   Transactions: ${transactions.length}
  `);
};
