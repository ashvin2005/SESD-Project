'use strict';
const { db } = require('../../config/database');
const { fromSmallestUnit } = require('../../shared/utils/money');
const { chatJSON } = require('../../shared/utils/groqClient');
const logger = require('../../shared/utils/logger');


async function getCategorySpending(userId) {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const from = threeMonthsAgo.toISOString().split('T')[0];
  const to = new Date().toISOString().split('T')[0];

  const rows = await db.raw(
    `SELECT COALESCE(c.name, 'Uncategorized') AS category,
            SUM(ABS(t.amount_in_base)) AS total,
            COUNT(*) AS tx_count,
            AVG(ABS(t.amount_in_base)) AS avg_tx
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     WHERE t.user_id = ? AND t.type = 'expense' AND t.transaction_date BETWEEN ? AND ?
     GROUP BY c.name ORDER BY total DESC`,
    [userId, from, to]
  );

  const monthlyRows = await db.raw(
    `SELECT TO_CHAR(DATE_TRUNC('month', transaction_date), 'Mon YYYY') AS month,
            SUM(CASE WHEN type='income' THEN amount_in_base ELSE 0 END) AS income,
            SUM(CASE WHEN type='expense' THEN ABS(amount_in_base) ELSE 0 END) AS expense
     FROM transactions
     WHERE user_id = ? AND transaction_date BETWEEN ? AND ?
     GROUP BY DATE_TRUNC('month', transaction_date)
     ORDER BY DATE_TRUNC('month', transaction_date)`,
    [userId, from, to]
  );

  return {
    byCategory: rows.rows.map((r) => ({
      category: r.category,
      total_3m: fromSmallestUnit(parseInt(r.total || 0)),
      monthly_avg: fromSmallestUnit(Math.round(parseInt(r.total || 0) / 3)),
      tx_count: parseInt(r.tx_count),
      avg_tx: fromSmallestUnit(parseInt(r.avg_tx || 0)),
    })),
    monthly: monthlyRows.rows.map((r) => ({
      month: r.month,
      income: fromSmallestUnit(parseInt(r.income || 0)),
      expense: fromSmallestUnit(parseInt(r.expense || 0)),
    })),
  };
}


async function generateBudgetRecommendations(userId) {
  const { byCategory, monthly } = await getCategorySpending(userId);

  const avgMonthlyIncome = monthly.length > 0
    ? Math.round(monthly.reduce((s, m) => s + m.income, 0) / monthly.length)
    : 0;

  const system = `You are a financial planning expert. Analyze 3-month spending patterns and suggest realistic monthly budgets.
For each category, provide a specific budget amount with reasoning. Be data-driven and practical.
Respond ONLY with a valid JSON object, no markdown.`;

  const user = `User's 3-month spending history:
Average monthly income: ₹${avgMonthlyIncome}

Category spending:
${byCategory.map((c) => `  ${c.category}: ₹${c.total_3m} total (₹${c.monthly_avg}/month avg, ${c.tx_count} transactions)`).join('\n')}

Monthly breakdown:
${monthly.map((m) => `  ${m.month}: income ₹${m.income}, expense ₹${m.expense}`).join('\n')}

Return a JSON object:
{
  "summary": "<2-sentence overview of spending patterns>",
  "recommendations": [
    {
      "category": "<category name>",
      "current_avg": <number>,
      "suggested_budget": <number>,
      "reasoning": "<specific explanation referencing their data>",
      "potential_savings": <number>
    }
  ],
  "total_suggested_budget": <number>,
  "total_potential_savings": <number>
}`;

  try {
    const result = await chatJSON({ system, user, temperature: 0.3, maxTokens: 1500 });
    logger.info('Budget recommendations generated', { userId });
    return { ...result, raw_data: { byCategory, monthly, avgMonthlyIncome } };
  } catch (err) {
    logger.error('Budget recommendation failed', { userId, error: err.message });
    throw err;
  }
}


async function generateGoalPlan(userId, { goal_amount, goal_description, months }) {
  const { byCategory, monthly } = await getCategorySpending(userId);

  const avgMonthlyIncome = monthly.length > 0
    ? Math.round(monthly.reduce((s, m) => s + m.income, 0) / monthly.length)
    : 0;
  const avgMonthlyExpense = monthly.length > 0
    ? Math.round(monthly.reduce((s, m) => s + m.expense, 0) / monthly.length)
    : 0;
  const currentMonthlySavings = avgMonthlyIncome - avgMonthlyExpense;
  const requiredMonthlySavings = Math.ceil(goal_amount / months);

  const system = `You are a personal finance coach. Create a detailed, actionable savings plan based on the user's real spending data.
Be specific about which categories to cut and by how much. Use ₹ for currency.
Respond ONLY with a valid JSON object, no markdown.`;

  const user = `Goal: Save ₹${goal_amount} in ${months} months${goal_description ? ` for "${goal_description}"` : ''}

Current financial situation:
- Average monthly income: ₹${avgMonthlyIncome}
- Average monthly expenses: ₹${avgMonthlyExpense}
- Current monthly savings: ₹${currentMonthlySavings}
- Required monthly savings to meet goal: ₹${requiredMonthlySavings}
- Gap to close: ₹${Math.max(0, requiredMonthlySavings - currentMonthlySavings)}/month

Spending breakdown (monthly averages):
${byCategory.map((c) => `  ${c.category}: ₹${c.monthly_avg}/month`).join('\n')}

Return:
{
  "feasibility": "achievable | challenging | difficult",
  "feasibility_reason": "<explanation>",
  "required_monthly_savings": ${requiredMonthlySavings},
  "current_monthly_savings": ${currentMonthlySavings},
  "monthly_gap": ${Math.max(0, requiredMonthlySavings - currentMonthlySavings)},
  "action_plan": [
    {
      "action": "<specific action>",
      "category": "<category>",
      "current_spend": <number>,
      "target_spend": <number>,
      "monthly_saving": <number>,
      "tip": "<practical advice>"
    }
  ],
  "timeline": [
    { "month": 1, "target_savings": <number>, "cumulative": <number> }
  ],
  "motivational_note": "<encouraging closing message>"
}
Include timeline for all ${months} months.`;

  try {
    const result = await chatJSON({ system, user, temperature: 0.4, maxTokens: 2000 });
    logger.info('Goal plan generated', { userId, goal_amount, months });
    return result;
  } catch (err) {
    logger.error('Goal planning failed', { userId, error: err.message });
    throw err;
  }
}


async function detectAndExplainAnomalies(userId) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const from = sevenDaysAgo.toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const histFrom = threeMonthsAgo.toISOString().split('T')[0];

  const [recent, historical] = await Promise.all([
    db('transactions as t')
      .leftJoin('categories as c', 't.category_id', 'c.id')
      .where('t.user_id', userId)
      .where('t.type', 'expense')
      .whereBetween('t.transaction_date', [from, today])
      .select('t.id', 't.description', 't.amount_in_base', 't.transaction_date', 'c.name as category')
      .orderBy('t.transaction_date', 'desc'),

    db.raw(
      `SELECT COALESCE(c.name, 'Uncategorized') AS category,
              AVG(ABS(t.amount_in_base)) AS avg_tx,
              MAX(ABS(t.amount_in_base)) AS max_tx,
              SUM(ABS(t.amount_in_base)) / 3 AS monthly_avg
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ? AND t.type = 'expense' AND t.transaction_date BETWEEN ? AND ?
       GROUP BY c.name`,
      [userId, histFrom, from]
    ),
  ]);

  if (recent.length === 0) return { anomalies: [], message: 'No recent transactions to analyze.' };

  const histMap = {};
  for (const row of historical.rows) {
    histMap[row.category] = {
      avg_tx: fromSmallestUnit(parseInt(row.avg_tx || 0)),
      max_tx: fromSmallestUnit(parseInt(row.max_tx || 0)),
      monthly_avg: fromSmallestUnit(parseInt(row.monthly_avg || 0)),
    };
  }

  const system = `You are a financial risk analyst. Detect genuinely unusual transactions compared to the user's historical patterns.
Only flag transactions that are significantly anomalous (not just slightly above average).
Respond ONLY with a valid JSON object, no markdown.`;

  const user = `Recent transactions (last 7 days):
${recent.map((t) => `  ID:${t.id} | ${t.transaction_date} | ${t.category || 'Uncategorized'} | ₹${fromSmallestUnit(parseInt(t.amount_in_base))} | "${t.description}"`).join('\n')}

Historical averages (last 3 months):
${Object.entries(histMap).map(([cat, stats]) => `  ${cat}: avg txn ₹${stats.avg_tx}, max txn ₹${stats.max_tx}, monthly avg ₹${stats.monthly_avg}`).join('\n')}

Return:
{
  "anomalies": [
    {
      "transaction_id": "<id>",
      "description": "<description>",
      "amount": <number>,
      "category": "<category>",
      "explanation": "<natural language explanation, e.g. This ₹15,000 charge is 8x your typical transaction>",
      "severity": "low | medium | high",
      "was_this_intentional": "<friendly question to confirm>"
    }
  ],
  "summary": "<brief summary of findings>"
}`;

  try {
    const result = await chatJSON({ system, user, temperature: 0.2, maxTokens: 1200 });
    logger.info('Anomaly detection completed', { userId, count: result.anomalies?.length || 0 });
    return result;
  } catch (err) {
    logger.error('Anomaly detection failed', { userId, error: err.message });
    throw err;
  }
}

module.exports = { generateBudgetRecommendations, generateGoalPlan, detectAndExplainAnomalies };
