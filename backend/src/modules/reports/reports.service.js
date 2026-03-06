'use strict';
const { db } = require('../../config/database');
const { fromSmallestUnit } = require('../../shared/utils/money');


async function getMonthlySummary(userId, months = 12) {
  const rows = await db.raw(
    `
    WITH months AS (
      SELECT generate_series(
        DATE_TRUNC('month', NOW()) - INTERVAL '${months - 1} months',
        DATE_TRUNC('month', NOW()),
        '1 month'
      )::DATE AS month
    ),
    tx_agg AS (
      SELECT
        DATE_TRUNC('month', transaction_date)::DATE AS month,
        SUM(CASE WHEN type = 'income' THEN amount_in_base ELSE 0 END) AS income,
        SUM(CASE WHEN type = 'expense' THEN ABS(amount_in_base) ELSE 0 END) AS expense
      FROM transactions
      WHERE user_id = ?
        AND transaction_date >= (NOW() - INTERVAL '${months} months')::DATE
      GROUP BY DATE_TRUNC('month', transaction_date)::DATE
    )
    SELECT
      m.month,
      TO_CHAR(m.month, 'Mon YYYY') AS label,
      COALESCE(t.income, 0) AS income,
      COALESCE(t.expense, 0) AS expense,
      COALESCE(t.income, 0) - COALESCE(t.expense, 0) AS net_savings
    FROM months m
    LEFT JOIN tx_agg t ON m.month = t.month
    ORDER BY m.month ASC
    `,
    [userId]
  );

  return rows.rows.map((r) => ({
    month: r.month,
    label: r.label,
    income: fromSmallestUnit(r.income),
    expense: fromSmallestUnit(r.expense),
    net_savings: fromSmallestUnit(r.net_savings),
    savings_rate: r.income > 0 ? Math.round(((r.income - r.expense) / r.income) * 100) : 0,
  }));
}


async function getCategoryBreakdown(userId, dateFrom, dateTo, type = 'expense') {
  const rows = await db.raw(
    `
    SELECT
      c.id AS category_id,
      COALESCE(c.name, 'Uncategorized') AS category_name,
      COALESCE(c.icon, '📦') AS icon,
      COALESCE(c.color, '#9ca3af') AS color,
      COUNT(t.id)::integer AS transaction_count,
      SUM(ABS(t.amount_in_base)) AS total_amount
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = ?
      AND t.type = ?
      AND t.transaction_date BETWEEN ? AND ?
    GROUP BY c.id, c.name, c.icon, c.color
    ORDER BY total_amount DESC
    `,
    [userId, type, dateFrom, dateTo]
  );

  const totalAmount = rows.rows.reduce((sum, r) => sum + parseInt(r.total_amount || 0), 0);

  return rows.rows.map((r) => ({
    category_id: r.category_id,
    category_name: r.category_name,
    icon: r.icon,
    color: r.color,
    transaction_count: r.transaction_count,
    total_amount: fromSmallestUnit(r.total_amount || 0),
    percentage: totalAmount > 0 ? Math.round((parseInt(r.total_amount || 0) / totalAmount) * 1000) / 10 : 0,
  }));
}


async function getYearOverYear(userId) {
  const rows = await db.raw(
    `
    SELECT
      EXTRACT(YEAR FROM transaction_date) AS year,
      EXTRACT(MONTH FROM transaction_date) AS month,
      SUM(CASE WHEN type = 'income' THEN amount_in_base ELSE 0 END) AS income,
      SUM(CASE WHEN type = 'expense' THEN ABS(amount_in_base) ELSE 0 END) AS expense
    FROM transactions
    WHERE user_id = ?
      AND transaction_date >= (NOW() - INTERVAL '2 years')::DATE
    GROUP BY EXTRACT(YEAR FROM transaction_date), EXTRACT(MONTH FROM transaction_date)
    ORDER BY year ASC, month ASC
    `,
    [userId]
  );

  return rows.rows.map((r) => ({
    year: parseInt(r.year),
    month: parseInt(r.month),
    income: fromSmallestUnit(r.income || 0),
    expense: fromSmallestUnit(r.expense || 0),
  }));
}


async function getSavingsTrend(userId, months = 12) {
  const summary = await getMonthlySummary(userId, months);
  return summary.map(({ month, label, net_savings, savings_rate }) => ({
    month,
    label,
    net_savings,
    savings_rate,
  }));
}


async function getExportData(userId, dateFrom, dateTo) {
  return db('transactions as t')
    .leftJoin('categories as c', 't.category_id', 'c.id')
    .where('t.user_id', userId)
    .whereBetween('t.transaction_date', [dateFrom, dateTo])
    .select(
      't.transaction_date',
      't.type',
      't.description',
      't.notes',
      db.raw(`t.amount::float / 100 AS amount`),
      't.currency',
      db.raw(`t.amount_in_base::float / 100 AS amount_in_base`),
      't.exchange_rate',
      'c.name as category',
      't.tags',
      't.created_at'
    )
    .orderBy('t.transaction_date', 'desc');
}

module.exports = { getMonthlySummary, getCategoryBreakdown, getYearOverYear, getSavingsTrend, getExportData };
