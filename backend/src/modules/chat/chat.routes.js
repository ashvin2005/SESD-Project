'use strict';
const express = require('express');
const { authenticate } = require('../../middleware/auth');
const controller = require('./chat.controller');
const rateLimit = require('express-rate-limit');

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many chat requests. Please wait a moment.' } },
});

const router = express.Router();
router.use(authenticate);

router.post('/message', chatLimiter, controller.message);

module.exports = router;
