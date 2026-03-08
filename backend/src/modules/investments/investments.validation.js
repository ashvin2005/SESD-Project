'use strict';
const Joi = require('joi');
const { SUPPORTED_CURRENCIES } = require('../../config/constants');

const INVESTMENT_TYPES = ['stock', 'mutual_fund', 'crypto'];

const createInvestment = {
  body: Joi.object({
    type: Joi.string().valid(...INVESTMENT_TYPES).required(),
    name: Joi.string().min(1).max(200).required(),
    symbol: Joi.string().max(50).uppercase().allow(null, '').optional(),
    quantity: Joi.number().positive().required(),
    buy_price: Joi.number().positive().required(),
    current_price: Joi.number().min(0).allow(null).optional(),
    currency: Joi.string().valid(...SUPPORTED_CURRENCIES).default('INR'),
    investment_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
    notes: Joi.string().max(1000).allow(null, '').optional(),
  }),
};

const updateInvestment = {
  params: Joi.object({ id: Joi.string().uuid().required() }),
  body: Joi.object({
    name: Joi.string().min(1).max(200),
    symbol: Joi.string().max(50).uppercase().allow(null, ''),
    quantity: Joi.number().positive(),
    buy_price: Joi.number().positive(),
    current_price: Joi.number().min(0).allow(null),
    notes: Joi.string().max(1000).allow(null, ''),
  }).min(1),
};

const investmentId = {
  params: Joi.object({ id: Joi.string().uuid().required() }),
};

module.exports = { createInvestment, updateInvestment, investmentId, INVESTMENT_TYPES };
