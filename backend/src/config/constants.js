'use strict';


const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SGD',
  'AED', 'SAR', 'HKD', 'NZD', 'SEK', 'NOK', 'DKK', 'MXN', 'BRL', 'ZAR',
];


const ZERO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW', 'VND', 'IDR']);


const TRANSACTION_TYPES = Object.freeze({
  INCOME: 'income',
  EXPENSE: 'expense',
});


const BUDGET_PERIODS = Object.freeze({
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
});


const AUTH_PROVIDERS = Object.freeze({
  LOCAL: 'local',
  GOOGLE: 'google',
});


const NOTIFICATION_TYPES = Object.freeze({
  BUDGET_WARNING: 'budget_warning',
  BUDGET_EXCEEDED: 'budget_exceeded',
  ANOMALY: 'anomaly',
  SYSTEM: 'system',
});


const RECURRING_FREQUENCIES = Object.freeze({
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
});


const DEFAULT_CATEGORIES = [

  { name: 'Salary', type: 'income', icon: '💼', color: '#10b981', is_default: true },
  { name: 'Freelance', type: 'income', icon: '💻', color: '#3b82f6', is_default: true },
  { name: 'Investment Returns', type: 'income', icon: '📈', color: '#8b5cf6', is_default: true },
  { name: 'Business', type: 'income', icon: '🏢', color: '#f59e0b', is_default: true },
  { name: 'Gifts Received', type: 'income', icon: '🎁', color: '#ec4899', is_default: true },
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
  { name: 'Personal Care', type: 'expense', icon: '💅', color: '#fb923c', is_default: true },
  { name: 'Subscriptions', type: 'expense', icon: '📱', color: '#34d399', is_default: true },
  { name: 'Other Expense', type: 'expense', icon: '📦', color: '#9ca3af', is_default: true },
];


const UPLOAD_LIMITS = Object.freeze({
  FILE_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  THUMBNAIL_WIDTH: 200,
});


const PAGINATION = Object.freeze({
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
});


const HEALTH_SCORE_WEIGHTS = Object.freeze({
  SAVINGS_RATE: 0.40,
  BUDGET_ADHERENCE: 0.30,
  EXPENSE_DIVERSITY: 0.15,
  INCOME_CONSISTENCY: 0.15,
});

module.exports = {
  SUPPORTED_CURRENCIES,
  ZERO_DECIMAL_CURRENCIES,
  TRANSACTION_TYPES,
  BUDGET_PERIODS,
  AUTH_PROVIDERS,
  NOTIFICATION_TYPES,
  RECURRING_FREQUENCIES,
  DEFAULT_CATEGORIES,
  UPLOAD_LIMITS,
  PAGINATION,
  HEALTH_SCORE_WEIGHTS,
};
