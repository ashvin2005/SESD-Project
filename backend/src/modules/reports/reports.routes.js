'use strict';
const express = require('express');
const { authenticate } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const controller = require('./reports.controller');
const schemas = require('./reports.validation');

const router = express.Router();
router.use(authenticate);

router.get('/monthly-summary', validate(schemas.monthlySummary), controller.monthlySummary);
router.get('/category-breakdown', validate(schemas.categoryBreakdown), controller.categoryBreakdown);
router.get('/year-over-year', controller.yearOverYear);
router.get('/savings-trend', validate(schemas.savingsTrend), controller.savingsTrend);
router.get('/export', validate(schemas.exportData), controller.exportData);

module.exports = router;
