'use strict';
const Joi = require('joi');

const monthlySummary = {
  query: Joi.object({
    months: Joi.number().integer().min(1).max(24).default(12),
  }),
};

const categoryBreakdown = {
  query: Joi.object({
    date_from: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
    date_to: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
    type: Joi.string().valid('income', 'expense').default('expense'),
  }),
};

const exportData = {
  query: Joi.object({
    date_from: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
    date_to: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
    format: Joi.string().valid('json', 'csv').default('json'),
  }),
};

const savingsTrend = {
  query: Joi.object({
    months: Joi.number().integer().min(1).max(24).default(12),
  }),
};

module.exports = { monthlySummary, categoryBreakdown, exportData, savingsTrend };
