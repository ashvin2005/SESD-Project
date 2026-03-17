'use strict';
const cron = require('node-cron');
const { db } = require('../config/database');
const { toSmallestUnit, convertCurrency } = require('../shared/utils/money');
const { getNextOccurrence, toDateString } = require('../shared/utils/dates');
const { getRate } = require('../modules/reports/exchangeRate.service');
const { invalidateCache } = require('../modules/dashboard/dashboard.service');
const logger = require('../shared/utils/logger');


async function processRecurringTransactions() {
  const today = toDateString(new Date());
  logger.info('Running recurring transactions job', { date: today });

  try {
    const dueRules = await db('recurring_rules as r')
      .join('users as u', 'r.user_id', 'u.id')
      .where('r.is_active', true)
      .where('r.next_occurrence', '<=', today)
      .where(function () {
        this.whereNull('r.end_date').orWhere('r.end_date', '>=', today);
      })
      .select('r.*', 'u.base_currency');

    logger.info(`Found ${dueRules.length} recurring rules to process`);

    for (const rule of dueRules) {
      try {
        await processRule(rule, today);
      } catch (err) {
        logger.error('Failed to process recurring rule', { ruleId: rule.id, error: err.message });
      }
    }
  } catch (err) {
    logger.error('Recurring transactions job failed', { error: err.message });
  }
}

async function processRule(rule, today) {
  const template = rule.template;
  const currency = template.currency || 'INR';
  const amountInSmallest = toSmallestUnit(template.amount, currency);


  let amountInBase = amountInSmallest;
  let exchangeRate = 1;
  if (currency !== rule.base_currency) {
    const rate = await getRate(currency, rule.base_currency);
    amountInBase = convertCurrency(amountInSmallest, currency, rule.base_currency, rate);
    exchangeRate = rate;
  }

  await db.transaction(async (trx) => {

    await trx('transactions').insert({
      user_id: rule.user_id,
      category_id: template.category_id || null,
      type: template.type,
      amount: amountInSmallest,
      currency,
      amount_in_base: amountInBase,
      exchange_rate: exchangeRate,
      description: template.description,
      notes: template.notes || null,
      transaction_date: today,
      is_recurring: true,
      tags: template.tags || [],
    });


    const nextOccurrence = getNextOccurrence(today, rule.frequency);
    const shouldDeactivate = rule.end_date && nextOccurrence > rule.end_date;

    await trx('recurring_rules').where({ id: rule.id }).update({
      next_occurrence: nextOccurrence,
      is_active: !shouldDeactivate,
      updated_at: trx.fn.now(),
    });
  });


  invalidateCache(rule.user_id);

  logger.info('Recurring transaction created', {
    ruleId: rule.id,
    userId: rule.user_id,
    description: template.description,
    nextOccurrence: getNextOccurrence(today, rule.frequency),
  });
}

function startRecurringTransactionsJob() {

  cron.schedule('0 1 * * *', processRecurringTransactions, {
    name: 'recurring-transactions',
    runOnInit: false,
  });
  logger.info('Recurring transactions job scheduled (daily at 01:00 UTC)');
}

module.exports = { startRecurringTransactionsJob, processRecurringTransactions };
