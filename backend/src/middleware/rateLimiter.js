'use strict';
const rateLimit = require('express-rate-limit');
const config = require('../config');
const { errorResponse } = require('../shared/utils/response');

const standardLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler(req, res) {
    res.status(429).json(errorResponse('Too many requests, please try again later.', 'RATE_LIMITED'));
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: config.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler(req, res) {
    res.status(429).json(errorResponse('Too many auth attempts. Please try again in 15 minutes.', 'RATE_LIMITED'));
  },
});

module.exports = { standardLimiter, authLimiter };
