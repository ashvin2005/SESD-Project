'use strict';
const budgetsRepo = require('./budgets.repository');
const categoryRepo = require('../categories/categories.repository');
const { toSmallestUnit, fromSmallestUnit } = require('../../shared/utils/money');
const { getPeriodBounds } = require('../../shared/utils/dates');
const { NotFoundError, ConflictError, BadRequestError } = require('../../shared/errors');
const logger = require('../../shared/utils/logger');

function computeProgress(budgetAmount, spent) {
  const remaining = Math.max(0, budgetAmount - spent);
  const percentage = budgetAmount > 0 ? Math.round((spent / budgetAmount) * 100) : 0;
  return {
    limit: fromSmallestUnit(budgetAmount),
    spent: fromSmallestUnit(spent),
    remaining: fromSmallestUnit(remaining),
    percentage,
  };
}

async function getAll(userId) {
  return budgetsRepo.findAllByUser(userId);
}

async function getSummary(userId) {
  const budgets = await budgetsRepo.findAllByUser(userId);
  if (budgets.length === 0) return [];

  // Fetch progress for each unique period in a single query per period
  const periods = [...new Set(budgets.map((b) => b.period))];
  const progressByPeriod = {};
  await Promise.all(
    periods.map(async (period) => {
      const bounds = getPeriodBounds(period);
      const rows = await budgetsRepo.findAllWithProgress(userId, bounds);
      progressByPeriod[period] = { rows, bounds };
    })
  );

  return budgets.map((b) => {
    const { rows, bounds } = progressByPeriod[b.period];
    const row = rows.find((r) => r.id === b.id);
    const spent = row ? parseInt(row.spent, 10) : 0;
    return {
      ...b,
      ...computeProgress(b.amount, spent),
      period_start: bounds.start,
      period_end: bounds.end,
    };
  });
}

async function getOne(userId, budgetId) {
  const budget = await budgetsRepo.findByIdAndUser(budgetId, userId);
  if (!budget) throw new NotFoundError('Budget');

  const bounds = getPeriodBounds(budget.period);
  const rows = await budgetsRepo.findAllWithProgress(userId, bounds);
  const row = rows.find((r) => r.id === budgetId);
  const spent = row ? parseInt(row.spent, 10) : 0;

  return {
    ...budget,
    ...computeProgress(budget.amount, spent),
    period_start: bounds.start,
    period_end: bounds.end,
  };
}

async function create(userId, data) {

  if (data.category_id) {
    const category = await categoryRepo.findByIdAndUser(data.category_id, userId);
    if (!category || !category.is_active) throw new NotFoundError('Category');
    if (category.type !== 'expense') throw new BadRequestError('Budgets can only be set for expense categories.');
  }


  const existing = await budgetsRepo.findActiveDuplicate(userId, data.category_id || null, data.period);
  if (existing) {
    const label = data.category_id ? 'this category' : 'overall spending';
    throw new ConflictError(`An active ${data.period} budget for ${label} already exists.`);
  }

  const budgetData = {
    user_id: userId,
    category_id: data.category_id || null,
    amount: toSmallestUnit(data.amount, data.currency || 'INR'),
    currency: data.currency || 'INR',
    period: data.period,
    start_date: data.start_date,
    alert_threshold: data.alert_threshold || 80,
  };

  const budget = await budgetsRepo.create(budgetData);
  logger.info('Budget created', { userId, budgetId: budget.id, period: data.period });
  return budget;
}

async function update(userId, budgetId, updates) {
  const budget = await budgetsRepo.findByIdAndUser(budgetId, userId);
  if (!budget) throw new NotFoundError('Budget');
  if (!budget.is_active) throw new BadRequestError('Cannot update an inactive budget.');

  const updateData = { ...updates };
  if (updates.amount !== undefined) {
    updateData.amount = toSmallestUnit(updates.amount, updates.currency || budget.currency);
  }

  return budgetsRepo.updateById(budgetId, userId, updateData);
}

async function remove(userId, budgetId) {
  const budget = await budgetsRepo.findByIdAndUser(budgetId, userId);
  if (!budget) throw new NotFoundError('Budget');
  await budgetsRepo.deleteById(budgetId, userId);
}

async function deactivate(userId, budgetId) {
  const budget = await budgetsRepo.findByIdAndUser(budgetId, userId);
  if (!budget) throw new NotFoundError('Budget');
  return budgetsRepo.updateById(budgetId, userId, { is_active: false });
}

module.exports = { getAll, getSummary, getOne, create, update, remove, deactivate };
