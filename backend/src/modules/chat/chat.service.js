'use strict';
const { db } = require('../../config/database');
const { fromSmallestUnit } = require('../../shared/utils/money');
const { chatConversation } = require('../../shared/utils/groqClient');
const logger = require('../../shared/utils/logger');

const SYSTEM_PROMPT = `You are a helpful personal finance assistant integrated with the user's transaction data.
You answer questions about spending, income, budgets, savings, and financial goals in plain English.
Be concise, friendly, and specific. Use ₹ for Indian Rupee amounts.
When asked about data, use the financial context provided — do not make up numbers.
If data is not available, say so honestly.`;


async function getFinancialContext(userId) {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().split('T')[0];
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

  const [currentMonth, lastMonth, threeMonthStats, budgetSummary, recentTx, categories] = await Promise.all([

    db('transactions')
      .where({ user_id: userId })
      .whereBetween('transaction_date', [firstOfMonth, today])
      .select(
        db.raw(`SUM(CASE WHEN type='income' THEN amount_in_base ELSE 0 END) AS income`),
        db.raw(`SUM(CASE WHEN type='expense' THEN ABS(amount_in_base) ELSE 0 END) AS expense`)
      )
      .first(),


    db('transactions')
      .where({ user_id: userId })
      .whereBetween('transaction_date', [lastMonthStart, lastMonthEnd])
      .select(
        db.raw(`SUM(CASE WHEN type='income' THEN amount_in_base ELSE 0 END) AS income`),
        db.raw(`SUM(CASE WHEN type='expense' THEN ABS(amount_in_base) ELSE 0 END) AS expense`)
      )
      .first(),


    db.raw(
      `SELECT COALESCE(c.name, 'Uncategorized') AS category,
              SUM(ABS(t.amount_in_base)) AS total
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ? AND t.type = 'expense' AND t.transaction_date >= ?
       GROUP BY c.name ORDER BY total DESC LIMIT 8`,
      [userId, threeMonthsAgo]
    ),


    db.raw(
      `SELECT b.amount, b.currency, b.period, COALESCE(c.name, 'Overall') AS category,
              COALESCE(SUM(ABS(t.amount_in_base)), 0) AS spent
       FROM budgets b
       LEFT JOIN categories c ON b.category_id = c.id
       LEFT JOIN transactions t ON t.category_id = b.category_id
         AND t.user_id = b.user_id AND t.type = 'expense'
         AND t.transaction_date >= DATE_TRUNC('month', CURRENT_DATE)
       WHERE b.user_id = ? AND b.is_active = true
       GROUP BY b.id, b.amount, b.currency, b.period, c.name`,
      [userId]
    ),


    db('transactions as t')
      .leftJoin('categories as c', 't.category_id', 'c.id')
      .where('t.user_id', userId)
      .select('t.type', 't.amount_in_base', 't.description', 't.transaction_date', 'c.name as category')
      .orderBy('t.transaction_date', 'desc')
      .limit(10),


    db('categories').where({ user_id: userId, is_active: true }).select('name', 'type'),
  ]);

  return {
    current_month: {
      income: fromSmallestUnit(parseInt(currentMonth?.income || 0)),
      expense: fromSmallestUnit(parseInt(currentMonth?.expense || 0)),
    },
    last_month: {
      income: fromSmallestUnit(parseInt(lastMonth?.income || 0)),
      expense: fromSmallestUnit(parseInt(lastMonth?.expense || 0)),
    },
    top_spending_categories_3m: threeMonthStats.rows.map((r) => ({
      category: r.category,
      total: fromSmallestUnit(parseInt(r.total || 0)),
    })),
    active_budgets: budgetSummary.rows.map((b) => ({
      category: b.category,
      limit: fromSmallestUnit(parseInt(b.amount)),
      spent: fromSmallestUnit(parseInt(b.spent || 0)),
      period: b.period,
    })),
    recent_transactions: recentTx.map((t) => ({
      date: t.transaction_date,
      type: t.type,
      amount: fromSmallestUnit(parseInt(t.amount_in_base)),
      description: t.description,
      category: t.category || 'Uncategorized',
    })),
    categories: categories.map((c) => c.name),
  };
}

/**
 * Processes a user chat message with full financial context.
 * @param {string} userId
 * @param {string} message - User's natural language question
 * @param {Array}  history - Previous [{role, content}] messages
 */
async function processChat(userId, message, history = []) {
  const context = await getFinancialContext(userId);

  const contextBlock = `
=== USER'S FINANCIAL CONTEXT ===
Current Month: Income ₹${context.current_month.income}, Expense ₹${context.current_month.expense}, Net ₹${context.current_month.income - context.current_month.expense}
Last Month: Income ₹${context.last_month.income}, Expense ₹${context.last_month.expense}

Top Spending (last 3 months):
${context.top_spending_categories_3m.map((c) => `  ${c.category}: ₹${c.total}`).join('\n')}

Active Budgets:
${context.active_budgets.length > 0 ? context.active_budgets.map((b) => `  ${b.category} (${b.period}): ₹${b.spent} / ₹${b.limit}`).join('\n') : '  None set'}

Recent Transactions:
${context.recent_transactions.map((t) => `  ${t.date} | ${t.type} | ₹${t.amount} | ${t.description} [${t.category}]`).join('\n')}
=== END CONTEXT ===`;

  const systemWithContext = `${SYSTEM_PROMPT}\n\n${contextBlock}`;

  const conversationHistory = [
    ...history.slice(-10),
    { role: 'user', content: message },
  ];

  const reply = await chatConversation({
    system: systemWithContext,
    history: conversationHistory,
    temperature: 0.5,
    maxTokens: 512,
  });

  logger.info('Chat response generated', { userId, messageLen: message.length });
  return { reply, context };
}

module.exports = { processChat, getFinancialContext };
