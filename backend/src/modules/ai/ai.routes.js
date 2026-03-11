'use strict';
const express = require('express');
const { authenticate } = require('../../middleware/auth');
const rateLimit = require('express-rate-limit');
const controller = require('./ai.controller');

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many AI requests. Try again in an hour.' } },
});

const router = express.Router();
router.use(authenticate);

router.get('/budget-recommendations', aiLimiter, controller.budgetRecommendations);
router.post('/goal-plan', aiLimiter, controller.goalPlan);
router.get('/anomalies', aiLimiter, controller.anomalies);

module.exports = router;
