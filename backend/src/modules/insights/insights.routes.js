'use strict';
const express = require('express');
const { authenticate } = require('../../middleware/auth');
const { standardLimiter } = require('../../middleware/rateLimiter');
const controller = require('./insights.controller');

const router = express.Router();
router.use(authenticate);


const insightsLimiter = require('express-rate-limit')({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many insight requests. Try again in an hour.' } },
});

router.get('/generate', insightsLimiter, controller.generate);
router.get('/summary', controller.getSummary);

module.exports = router;
