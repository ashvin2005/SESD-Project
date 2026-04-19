'use strict';
const cron = require('node-cron');
const { db } = require('../config/database');
const { getPeriodBounds } = require('../shared/utils/dates');
const budgetsRepo = require('../modules/budgets/budgets.repository');
const notificationEmitter = require('../shared/events/NotificationEmitter');
const logger = require('../shared/utils/logger');


async function checkBudgetAlerts() {
  logger.info('Running budget alert job');

  try {

    const users = await db('budgets as b')
      .join('users as u', 'b.user_id', 'u.id')
      .join('user_preferences as p', 'u.id', 'p.user_id')
      .where('b.is_active', true)
      .select('u.id', 'u.email', 'p.notifications_enabled', 'p.email_notifications', 'b.period')
      .distinct('u.id', 'u.email', 'p.notifications_enabled', 'p.email_notifications', 'b.period');

    for (const user of users) {
      if (!user.notifications_enabled) continue;

      try {
        await processUserBudgets(user);
      } catch (err) {
        logger.error('Budget alert error for user', { userId: user.id, error: err.message });
      }
    }
  } catch (err) {
    logger.error('Budget alert job failed', { error: err.message });
  }
}

async function processUserBudgets(user) {

  const periods = ['monthly', 'weekly', 'yearly'];

  for (const period of periods) {
    const bounds = getPeriodBounds(period);
    const budgetsWithProgress = await budgetsRepo.findAllWithProgress(user.id, bounds);

    for (const budget of budgetsWithProgress) {
      if (budget.period !== period) continue;

      const budgetAmount = parseInt(budget.budget_amount, 10);
      const spent = parseInt(budget.spent, 10);
      const percentage = budgetAmount > 0 ? Math.round((spent / budgetAmount) * 100) : 0;


      if (percentage < (budget.alert_threshold || 80)) continue;

      notificationEmitter.emit('budget.alert', {
        userId: user.id,
        budget,
        percentage,
        userEmail: user.email,
        emailEnabled: user.email_notifications,
      });
    }
  }
}

function startBudgetAlertJob() {

  cron.schedule('0 * * * *', checkBudgetAlerts, {
    name: 'budget-alerts',
    runOnInit: false,
  });
  logger.info('Budget alert job scheduled (every hour)');
}

module.exports = { startBudgetAlertJob, checkBudgetAlerts };
