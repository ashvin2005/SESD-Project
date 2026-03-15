'use strict';
const NodeCache = require('node-cache');
const { db } = require('../../config/database');
const { fromSmallestUnit } = require('../../shared/utils/money');
const { getPeriodBounds } = require('../../shared/utils/dates');
const budgetsRepo = require('../budgets/budgets.repository');
const notificationsRepo = require('../notifications/notifications.repository');
const { HEALTH_SCORE_WEIGHTS } = require('../../config/constants');


const dashboardCache = new NodeCache({ stdTTL: 60, checkperiod: 30 });

function getCacheKey(userId) {
  return `dashboard:${userId}`;
}


function invalidateCache(userId) {
  dashboardCache.del(getCacheKey(userId));
}

async function buildDashboard(userId) {
  const cached = dashboardCache.get(getCacheKey(userId));
  if (cached) return cached;

  const now = new Date();
  const monthBounds = getPeriodBounds('monthly', now);
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(now.getMonth() - 5);
  const sixMonthsAgoStr = new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth(), 1)
    .toISOString()
    .split('T')[0];

  const [summaryCards, recentTx, categoryBreakdown, trendRows, budgetsWithProgress, unreadCount, healthScore] =
    await Promise.all([
      getSummaryCards(userId, monthBounds),
      getRecentTransactions(userId),
      getCategoryBreakdown(userId, monthBounds),
      getMonthlyTrend(userId, sixMonthsAgoStr, monthBounds.end),
      budgetsRepo.findAllWithProgress(userId, monthBounds),
      notificationsRepo.countUnread(userId),
      computeHealthScore(userId, monthBounds),
    ]);

  const budgetAlerts = budgetsWithProgress
    .filter((b) => {
      const pct = b.budget_amount > 0 ? Math.round((b.spent / b.budget_amount) * 100) : 0;
      return pct >= 80;
    })
    .map((b) => ({
      id: b.id,
      category_name: b.category_name || 'Overall',
      period: b.period,
      percentage: b.budget_amount > 0 ? Math.round((b.spent / b.budget_amount) * 100) : 0,
      limit: fromSmallestUnit(b.budget_amount),
      spent: fromSmallestUnit(b.spent),
    }));

  const result = {
    summary: summaryCards,
    recent_transactions: recentTx,
    category_breakdown: categoryBreakdown,
    monthly_trend: trendRows,
    budget_alerts: budgetAlerts,
    unread_notifications: unreadCount,
    health_score: healthScore,
    period: { start: monthBounds.start, end: monthBounds.end },
    generated_at: new Date().toISOString(),
  };

  dashboardCache.set(getCacheKey(userId), result);
  return result;
}

async function getSummaryCards(userId, monthBounds) {
  const [{ income, expense }] = await db('transactions')
    .where({ user_id: userId })
    .whereBetween('transaction_date', [monthBounds.start, monthBounds.end])
    .select(
      db.raw(`SUM(CASE WHEN type = 'income' THEN amount_in_base ELSE 0 END) AS income`),
      db.raw(`SUM(CASE WHEN type = 'expense' THEN ABS(amount_in_base) ELSE 0 END) AS expense`)
    );

  const inc = parseInt(income || 0, 10);
  const exp = parseInt(expense || 0, 10);
  return {
    total_income: fromSmallestUnit(inc),
    total_expense: fromSmallestUnit(exp),
    net_savings: fromSmallestUnit(inc - exp),
    savings_rate: inc > 0 ? Math.round(((inc - exp) / inc) * 100) : 0,
  };
}

async function getRecentTransactions(userId, limit = 10) {
  return db('transactions as t')
    .leftJoin('categories as c', 't.category_id', 'c.id')
    .where('t.user_id', userId)
    .select(
      't.id', 't.type', 't.description', 't.transaction_date',
      db.raw(`t.amount::float / 100 AS amount`),
      't.currency',
      'c.name as category_name', 'c.icon as category_icon', 'c.color as category_color'
    )
    .orderBy('t.transaction_date', 'desc')
    .orderBy('t.created_at', 'desc')
    .limit(limit);
}

async function getCategoryBreakdown(userId, monthBounds) {
  const rows = await db('transactions as t')
    .leftJoin('categories as c', 't.category_id', 'c.id')
    .where({ 't.user_id': userId, 't.type': 'expense' })
    .whereBetween('t.transaction_date', [monthBounds.start, monthBounds.end])
    .select(
      'c.name as category_name',
      'c.icon as category_icon',
      'c.color as category_color',
      db.raw(`SUM(ABS(t.amount_in_base)) AS total`)
    )
    .groupBy('c.name', 'c.icon', 'c.color')
    .orderBy('total', 'desc')
    .limit(8);

  const grandTotal = rows.reduce((s, r) => s + parseInt(r.total || 0), 0);
  return rows.map((r) => ({
    category_name: r.category_name || 'Uncategorized',
    icon: r.category_icon || '📦',
    color: r.category_color || '#9ca3af',
    amount: fromSmallestUnit(r.total || 0),
    percentage: grandTotal > 0 ? Math.round((parseInt(r.total || 0) / grandTotal) * 1000) / 10 : 0,
  }));
}

async function getMonthlyTrend(userId, fromDate, toDate) {
  const rows = await db.raw(
    `
    WITH months AS (
      SELECT generate_series(?::DATE, ?::DATE, '1 month'::INTERVAL)::DATE AS month
    )
    SELECT
      m.month,
      TO_CHAR(m.month, 'Mon') AS label,
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount_in_base ELSE 0 END), 0) AS income,
      COALESCE(SUM(CASE WHEN t.type = 'expense' THEN ABS(t.amount_in_base) ELSE 0 END), 0) AS expense
    FROM months m
    LEFT JOIN transactions t
      ON t.user_id = ?
      AND DATE_TRUNC('month', t.transaction_date)::DATE = m.month
    GROUP BY m.month
    ORDER BY m.month ASC
    `,
    [fromDate, toDate, userId]
  );

  return rows.rows.map((r) => ({
    month: r.month,
    label: r.label,
    income: fromSmallestUnit(r.income || 0),
    expense: fromSmallestUnit(r.expense || 0),
  }));
}

async function computeHealthScore(userId, monthBounds) {


  const [savingsRow] = await db('transactions')
    .where({ user_id: userId })
    .where('transaction_date', '>=', db.raw(`NOW() - INTERVAL '3 months'`))
    .select(
      db.raw(`SUM(CASE WHEN type = 'income' THEN amount_in_base ELSE 0 END) AS income`),
      db.raw(`SUM(CASE WHEN type = 'expense' THEN ABS(amount_in_base) ELSE 0 END) AS expense`)
    );

  const income = parseInt(savingsRow.income || 0, 10);
  const expense = parseInt(savingsRow.expense || 0, 10);
  const savingsRate = income > 0 ? Math.max(0, Math.min(1, (income - expense) / income)) : 0;
  const savingsScore = savingsRate * 100;


  const budgetRows = await budgetsRepo.findAllWithProgress(userId, monthBounds);
  const budgetAdherence = budgetRows.length === 0
    ? 50
    : (budgetRows.filter((b) => b.spent <= b.budget_amount).length / budgetRows.length) * 100;


  const categoryRows = await db('transactions')
    .where({ user_id: userId, type: 'expense' })
    .whereBetween('transaction_date', [monthBounds.start, monthBounds.end])
    .select('category_id', db.raw('SUM(ABS(amount_in_base)) AS total'))
    .groupBy('category_id');

  const totalExp = categoryRows.reduce((s, r) => s + parseInt(r.total, 10), 0);
  let diversityScore = 50;
  if (totalExp > 0 && categoryRows.length > 1) {
    const hhi = categoryRows.reduce((s, r) => {
      const share = parseInt(r.total, 10) / totalExp;
      return s + share * share;
    }, 0);
    diversityScore = Math.round((1 - hhi) * 100); 
  }


  const incomeMonthsResult = await db.raw(
    `SELECT COUNT(DISTINCT DATE_TRUNC('month', transaction_date)) AS months_with_income
     FROM transactions
     WHERE user_id = ? AND type = 'income'
       AND transaction_date >= NOW() - INTERVAL '6 months'`,
    [userId]
  );
  const monthsWithIncome = parseInt(incomeMonthsResult.rows[0].months_with_income, 10);
  const consistencyScore = Math.min(100, (monthsWithIncome / 6) * 100);

  const total = Math.round(
    savingsScore * HEALTH_SCORE_WEIGHTS.SAVINGS_RATE +
    budgetAdherence * HEALTH_SCORE_WEIGHTS.BUDGET_ADHERENCE +
    diversityScore * HEALTH_SCORE_WEIGHTS.EXPENSE_DIVERSITY +
    consistencyScore * HEALTH_SCORE_WEIGHTS.INCOME_CONSISTENCY
  );

  return {
    score: Math.max(0, Math.min(100, total)),
    breakdown: {
      savings_rate: Math.round(savingsScore),
      budget_adherence: Math.round(budgetAdherence),
      expense_diversity: Math.round(diversityScore),
      income_consistency: Math.round(consistencyScore),
    },
  };
}

module.exports = { buildDashboard, invalidateCache };
