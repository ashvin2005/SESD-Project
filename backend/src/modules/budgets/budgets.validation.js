'use strict';
const Joi = require('joi');
const { SUPPORTED_CURRENCIES, BUDGET_PERIODS } = require('../../config/constants');

const createBudget = {
  body: Joi.object({
    category_id: Joi.string().uuid().allow(null),
    amount: Joi.number().positive().required(),
    currency: Joi.string().valid(...SUPPORTED_CURRENCIES).default('INR'),
    period: Joi.string().valid(...Object.values(BUDGET_PERIODS)).required(),
    start_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
    alert_threshold: Joi.number().integer().min(1).max(100).default(80),
  }),
};

const updateBudget = {
  params: Joi.object({ id: Joi.string().uuid().required() }),
  body: Joi.object({
    amount: Joi.number().positive(),
    currency: Joi.string().valid(...SUPPORTED_CURRENCIES),
    alert_threshold: Joi.number().integer().min(1).max(100),
  }).min(1),
};

const budgetIdParam = {
  params: Joi.object({ id: Joi.string().uuid().required() }),
};

module.exports = { createBudget, updateBudget, budgetIdParam };
