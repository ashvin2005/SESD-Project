'use strict';
const aiService = require('./ai.service');
const { successResponse } = require('../../shared/utils/response');
const { BadRequestError } = require('../../shared/errors');

async function budgetRecommendations(req, res, next) {
  try {
    const result = await aiService.generateBudgetRecommendations(req.user.id);
    res.json(successResponse(result));
  } catch (err) { next(err); }
}

async function goalPlan(req, res, next) {
  try {
    const { goal_amount, goal_description, months } = req.body;
    if (!goal_amount || goal_amount <= 0) throw new BadRequestError('goal_amount must be a positive number');
    if (!months || months < 1 || months > 60) throw new BadRequestError('months must be between 1 and 60');
    const result = await aiService.generateGoalPlan(req.user.id, {
      goal_amount: parseFloat(goal_amount),
      goal_description: goal_description || '',
      months: parseInt(months, 10),
    });
    res.json(successResponse(result));
  } catch (err) { next(err); }
}

async function anomalies(req, res, next) {
  try {
    const result = await aiService.detectAndExplainAnomalies(req.user.id);
    res.json(successResponse(result));
  } catch (err) { next(err); }
}

module.exports = { budgetRecommendations, goalPlan, anomalies };
