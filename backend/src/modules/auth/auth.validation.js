'use strict';
const Joi = require('joi');
const { SUPPORTED_CURRENCIES } = require('../../config/constants');

const register = {
  body: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().lowercase().required(),
    password: Joi.string().min(8).max(128).required(),
    base_currency: Joi.string()
      .valid(...SUPPORTED_CURRENCIES)
      .default('INR'),
  }),
};

const login = {
  body: Joi.object({
    email: Joi.string().email().lowercase().required(),
    password: Joi.string().required(),
  }),
};

const updateProfile = {
  body: Joi.object({
    name: Joi.string().min(2).max(100),
    base_currency: Joi.string().valid(...SUPPORTED_CURRENCIES),
    avatar_url: Joi.string().uri().allow(null, ''),
  }).min(1),
};

const changePassword = {
  body: Joi.object({
    current_password: Joi.string().required(),
    new_password: Joi.string().min(8).max(128).required(),
  }),
};

const updatePreferences = {
  body: Joi.object({
    notifications_enabled: Joi.boolean(),
    email_notifications: Joi.boolean(),
    dashboard_default_range: Joi.string().valid('week', 'month', 'year'),
    theme: Joi.string().valid('light', 'dark'),
  }).min(1),
};

const refreshToken = {
  body: Joi.object({
    refresh_token: Joi.string().required(),
  }),
};

module.exports = { register, login, updateProfile, changePassword, updatePreferences, refreshToken };
