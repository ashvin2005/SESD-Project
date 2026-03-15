'use strict';
const insightsService = require('./insights.service');
const { successResponse } = require('../../shared/utils/response');

async function generate(req, res, next) {
  try {
    const result = await insightsService.generateInsights(req.user.id);
    res.json(successResponse(result));
  } catch (err) { next(err); }
}

async function getSummary(req, res, next) {
  try {
    const summary = await insightsService.getSummaryOnly(req.user.id);
    res.json(successResponse({ summary }));
  } catch (err) { next(err); }
}

module.exports = { generate, getSummary };
