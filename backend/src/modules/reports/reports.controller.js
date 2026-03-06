'use strict';
const reportsService = require('./reports.service');
const { successResponse } = require('../../shared/utils/response');

async function monthlySummary(req, res, next) {
  try {
    const months = parseInt(req.query.months, 10) || 12;
    const data = await reportsService.getMonthlySummary(req.user.id, months);
    res.json(successResponse({ summary: data }));
  } catch (err) { next(err); }
}

async function categoryBreakdown(req, res, next) {
  try {
    const { date_from, date_to, type = 'expense' } = req.query;
    const data = await reportsService.getCategoryBreakdown(req.user.id, date_from, date_to, type);
    res.json(successResponse({ breakdown: data }));
  } catch (err) { next(err); }
}

async function yearOverYear(req, res, next) {
  try {
    const data = await reportsService.getYearOverYear(req.user.id);
    res.json(successResponse({ year_over_year: data }));
  } catch (err) { next(err); }
}

async function savingsTrend(req, res, next) {
  try {
    const months = parseInt(req.query.months, 10) || 12;
    const data = await reportsService.getSavingsTrend(req.user.id, months);
    res.json(successResponse({ trend: data }));
  } catch (err) { next(err); }
}

async function exportData(req, res, next) {
  try {
    const { date_from, date_to, format = 'json' } = req.query;
    const data = await reportsService.getExportData(req.user.id, date_from, date_to);

    if (format === 'csv') {
      const headers = ['date', 'type', 'description', 'notes', 'amount', 'currency', 'amount_in_base', 'exchange_rate', 'category', 'tags'];
      const rows = data.map((r) => [
        r.transaction_date,
        r.type,
        `"${(r.description || '').replace(/"/g, '""')}"`,
        `"${(r.notes || '').replace(/"/g, '""')}"`,
        r.amount,
        r.currency,
        r.amount_in_base,
        r.exchange_rate,
        r.category || '',
        `"${(r.tags || []).join(';')}"`,
      ].join(','));

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="transactions_${date_from}_${date_to}.csv"`);
      return res.send([headers.join(','), ...rows].join('\n'));
    }

    res.json(successResponse({ transactions: data, count: data.length }));
  } catch (err) { next(err); }
}

module.exports = { monthlySummary, categoryBreakdown, yearOverYear, savingsTrend, exportData };
