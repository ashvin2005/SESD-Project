'use strict';
const Joi = require('joi');
const { SUPPORTED_CURRENCIES } = require('../../config/constants');

const currencyValidator = Joi.string().valid(...SUPPORTED_CURRENCIES).default('INR');

const createTransaction = {
  body: Joi.object({
    category_id: Joi.string().uuid().allow(null),
    type: Joi.string().valid('income', 'expense').required(),
    amount: Joi.number().required().messages({
      'number.base': 'amount must be a number (use negative for refunds)',
    }),
    currency: currencyValidator,
    description: Joi.string().min(1).max(500).required(),
    notes: Joi.string().max(5000).allow(null, ''),
    transaction_date: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .required()
      .messages({ 'string.pattern.base': 'transaction_date must be YYYY-MM-DD' }),
    is_recurring: Joi.boolean().default(false),
    tags: Joi.array().items(Joi.string().max(30)).max(10).default([]),
  }),
};

const updateTransaction = {
  params: Joi.object({ id: Joi.string().uuid().required() }),
  body: Joi.object({
    category_id: Joi.string().uuid().allow(null),
    amount: Joi.number(),
    currency: currencyValidator,
    description: Joi.string().min(1).max(500),
    notes: Joi.string().max(5000).allow(null, ''),
    transaction_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
    tags: Joi.array().items(Joi.string().max(30)).max(10),
  }).min(1),
};

const listTransactions = {
  query: Joi.object({
    type: Joi.string().valid('income', 'expense'),
    category_id: Joi.string().uuid(),
    date_from: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
    date_to: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
    min_amount: Joi.number(),
    max_amount: Joi.number(),
    currency: currencyValidator,
    search: Joi.string().max(100),
    tags: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()),
    sort: Joi.string()
      .valid('transaction_date', '-transaction_date', 'amount', '-amount', 'created_at', '-created_at')
      .default('-transaction_date'),
    limit: Joi.number().integer().min(1).max(100).default(20),
    cursor: Joi.string(), 
  }),
};

const transactionIdParam = {
  params: Joi.object({ id: Joi.string().uuid().required() }),
};

const bulkDelete = {
  body: Joi.object({
    ids: Joi.array().items(Joi.string().uuid()).min(1).max(50).required(),
  }),
};

const bulkRecategorize = {
  body: Joi.object({
    ids: Joi.array().items(Joi.string().uuid()).min(1).max(50).required(),
    category_id: Joi.string().uuid().required(),
  }),
};

module.exports = {
  createTransaction,
  updateTransaction,
  listTransactions,
  transactionIdParam,
  bulkDelete,
  bulkRecategorize,
};
