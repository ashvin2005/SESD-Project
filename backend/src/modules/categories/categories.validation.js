'use strict';
const Joi = require('joi');

const createCategory = {
  body: Joi.object({
    name: Joi.string().min(1).max(50).required(),
    type: Joi.string().valid('income', 'expense').required(),
    icon: Joi.string().max(50).allow(null, ''),
    color: Joi.string()
      .pattern(/^#[0-9A-Fa-f]{6}$/)
      .allow(null, '')
      .messages({ 'string.pattern.base': 'color must be a valid hex color (e.g. #ff5733)' }),
  }),
};

const updateCategory = {
  body: Joi.object({
    name: Joi.string().min(1).max(50),
    icon: Joi.string().max(50).allow(null, ''),
    color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).allow(null, ''),
  }).min(1),
  params: Joi.object({ id: Joi.string().uuid().required() }),
};

const categoryIdParam = {
  params: Joi.object({ id: Joi.string().uuid().required() }),
};

const mergeCategory = {
  params: Joi.object({ id: Joi.string().uuid().required() }),
  body: Joi.object({
    target_category_id: Joi.string().uuid().required(),
  }),
};

module.exports = { createCategory, updateCategory, categoryIdParam, mergeCategory };
