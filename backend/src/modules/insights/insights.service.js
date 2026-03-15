'use strict';
const NodeCache = require('node-cache');
const { db } = require('../../config/database');
const config = require('../../config');
const { fromSmallestUnit } = require('../../shared/utils/money');
const { chatJSON } = require('../../shared/utils/groqClient');
const logger = require('../../shared/utils/logger');


const insightsCache = new NodeCache({ stdTTL: 86400, checkperiod: 600 });

function getCacheKey(userId) {
  return `insights:${userId}`;
}


async function aggregateFinancialSummary(userId) {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const fromDate = threeMonthsAgo.toISOString().split('T')[0];
  const toDate = new Date().toISOString().split('T')[0];

  const [monthly, categories, totals] = await Promise.all([

    db.raw(
      `
      SELECT
        TO_CHAR(DATE_TRUNC('month', transaction_date), 'Mon YYYY') AS month,
        SUM(CASE WHEN type = 'income' THEN amount_in_base ELSE 0 END) AS income,
        SUM(CASE WHEN type = 'expense' THEN ABS(amount_in_base) ELSE 0 END) AS expense
      FROM transactions
      WHERE user_id = ? AND transaction_date BETWEEN ? AND ?
      GROUP BY DATE_TRUNC('month', transaction_date)
      ORDER BY DATE_TRUNC('month', transaction_date)
      `,
      [userId, fromDate, toDate]
    ),

    db.raw(
      `
      SELECT
        COALESCE(c.name, 'Uncategorized') AS category,
        SUM(ABS(t.amount_in_base)) AS total
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ? AND t.type = 'expense' AND t.transaction_date BETWEEN ? AND ?
      GROUP BY c.name
      ORDER BY total DESC
      LIMIT 5
      `,
      [userId, fromDate, toDate]
    ),

    db('transactions')
      .where({ user_id: userId })
      .whereBetween('transaction_date', [fromDate, toDate])
      .select(
        db.raw(`SUM(CASE WHEN type = 'income' THEN amount_in_base ELSE 0 END) AS total_income`),
        db.raw(`SUM(CASE WHEN type = 'expense' THEN ABS(amount_in_base) ELSE 0 END) AS total_expense`),
        db.raw(`COUNT(*) AS transaction_count`)
      )
      .first(),
  ]);

  const totalIncome = parseInt(totals.total_income || 0, 10);
  const totalExpense = parseInt(totals.total_expense || 0, 10);
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;

  return {
    period: `${fromDate} to ${toDate}`,
    transaction_count: parseInt(totals.transaction_count, 10),
    total_income: fromSmallestUnit(totalIncome),
    total_expense: fromSmallestUnit(totalExpense),
    net_savings: fromSmallestUnit(totalIncome - totalExpense),
    savings_rate_percent: savingsRate,
    monthly_breakdown: monthly.rows.map((r) => ({
      month: r.month,
      income: fromSmallestUnit(r.income || 0),
      expense: fromSmallestUnit(r.expense || 0),
    })),
    top_expense_categories: categories.rows.map((r) => ({
      category: r.category,
      amount: fromSmallestUnit(r.total || 0),
    })),
  };
}


async function generateInsights(userId) {
  const cached = insightsCache.get(getCacheKey(userId));
  if (cached) return { insights: cached, cached: true };

  const summary = await aggregateFinancialSummary(userId);

  if (!config.groq.apiKey) {
    const insights = generateRuleBasedInsights(summary);
    insightsCache.set(getCacheKey(userId), insights);
    return { insights, cached: false, source: 'rule_based' };
  }

  try {
    const insights = await callGroq(summary);
    insightsCache.set(getCacheKey(userId), insights);
    logger.info('LLM insights generated', { userId, source: 'groq' });
    return { insights, cached: false, source: 'llm' };
  } catch (err) {
    logger.warn('Groq insight generation failed, using rule-based', { userId, error: err.message });
    const insights = generateRuleBasedInsights(summary);
    return { insights, cached: false, source: 'rule_based' };
  }
}

function buildPrompt(summary) {
  return `Analyze this personal financial data and provide exactly 3 actionable insights.

Financial Summary (last 3 months):
- Period: ${summary.period}
- Total Income: ₹${summary.total_income}
- Total Expenses: ₹${summary.total_expense}
- Net Savings: ₹${summary.net_savings}
- Savings Rate: ${summary.savings_rate_percent}%
- Transactions: ${summary.transaction_count}

Monthly Breakdown:
${summary.monthly_breakdown.map((m) => `  ${m.month}: Income ₹${m.income}, Expense ₹${m.expense}`).join('\n')}

Top Expense Categories:
${summary.top_expense_categories.map((c) => `  ${c.category}: ₹${c.amount}`).join('\n')}

Respond with a JSON array of exactly 3 objects, each with these fields:
- category: string (e.g., "Savings", "Spending", "Budget")
- severity: "info" | "warning" | "critical"
- title: string (short, max 60 chars)
- recommendation: string (actionable, max 200 chars)

Return only valid JSON, no markdown.`;
}

async function callGroq(summary) {
  const system = 'You are a financial advisor. Respond ONLY with a valid JSON array, no markdown.';
  const user = buildPrompt(summary);
  const result = await chatJSON({ system, user, temperature: 0.3, maxTokens: 600 });
  return Array.isArray(result) ? result : (result.insights || []);
}


function generateRuleBasedInsights(summary) {
  const insights = [];


  if (summary.savings_rate_percent < 10) {
    insights.push({
      category: 'Savings',
      severity: 'critical',
      title: 'Low Savings Rate',
      recommendation: `Your savings rate is ${summary.savings_rate_percent}%. Aim for at least 20% by reviewing recurring expenses.`,
    });
  } else if (summary.savings_rate_percent < 20) {
    insights.push({
      category: 'Savings',
      severity: 'warning',
      title: 'Below Target Savings',
      recommendation: `Savings rate of ${summary.savings_rate_percent}% is below the recommended 20%. Consider automating transfers to savings.`,
    });
  } else {
    insights.push({
      category: 'Savings',
      severity: 'info',
      title: 'Good Savings Discipline',
      recommendation: `Your ${summary.savings_rate_percent}% savings rate is healthy. Consider investing the surplus to beat inflation.`,
    });
  }


  if (summary.top_expense_categories.length > 0) {
    const top = summary.top_expense_categories[0];
    const pct = summary.total_expense > 0 ? Math.round((top.amount / summary.total_expense) * 100) : 0;
    insights.push({
      category: 'Spending',
      severity: pct > 40 ? 'warning' : 'info',
      title: `${top.category} is Your Biggest Expense`,
      recommendation: `${top.category} accounts for ${pct}% of total spending. ${pct > 40 ? 'Consider reducing this to balance your budget.' : 'Review if this aligns with your priorities.'}`,
    });
  }


  const months = summary.monthly_breakdown;
  if (months.length >= 2) {
    const lastTwo = months.slice(-2);
    const change = lastTwo[0].expense > 0
      ? Math.round(((lastTwo[1].expense - lastTwo[0].expense) / lastTwo[0].expense) * 100)
      : 0;
    if (change > 15) {
      insights.push({
        category: 'Spending',
        severity: 'warning',
        title: 'Spending Increased This Month',
        recommendation: `Expenses rose ${change}% compared to last month. Review your transactions to identify unplanned spending.`,
      });
    } else {
      insights.push({
        category: 'Budget',
        severity: 'info',
        title: 'Set a Budget Goal',
        recommendation: 'Create monthly budgets for your top categories to stay on track and prevent overspending.',
      });
    }
  } else {
    insights.push({
      category: 'Budget',
      severity: 'info',
      title: 'Start Tracking Consistently',
      recommendation: 'Add transactions regularly for at least 3 months to unlock personalized financial insights.',
    });
  }

  return insights;
}

async function getSummaryOnly(userId) {
  return aggregateFinancialSummary(userId);
}

function invalidateCache(userId) {
  insightsCache.del(getCacheKey(userId));
}

module.exports = { generateInsights, getSummaryOnly, invalidateCache };
