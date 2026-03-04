'use strict';
const Joi = require('joi');
const { SUPPORTED_CURRENCIES, RECURRING_FREQUENCIES } = require('../../config/constants');

const createRule = {
  body: Joi.object({
    category_id: Joi.string().uuid().allow(null),
    type: Joi.string().valid('income', 'expense').required(),
    amount: Joi.number().positive().required(),
    currency: Joi.string().valid(...SUPPORTED_CURRENCIES).default('INR'),
    description: Joi.string().min(1).max(500).required(),
    notes: Joi.string().max(5000).allow(null, ''),
    tags: Joi.array().items(Joi.string().max(30)).max(10).default([]),
    frequency: Joi.string().valid(...Object.values(RECURRING_FREQUENCIES)).required(),
    start_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
    end_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow(null),
  }),
};

const updateRule = {
  params: Joi.object({ id: Joi.string().uuid().required() }),
  body: Joi.object({
    frequency: Joi.string().valid(...Object.values(RECURRING_FREQUENCIES)),
    next_occurrence: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
    end_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow(null),
    is_active: Joi.boolean(),
    template: Joi.object({
      amount: Joi.number().positive(),
      currency: Joi.string().valid(...SUPPORTED_CURRENCIES),
      description: Joi.string().min(1).max(500),
      notes: Joi.string().max(5000).allow(null, ''),
      tags: Joi.array().items(Joi.string().max(30)).max(10),
    }),
  }).min(1),
};

const ruleIdParam = {
  params: Joi.object({ id: Joi.string().uuid().required() }),
};

module.exports = { createRule, updateRule, ruleIdParam };
