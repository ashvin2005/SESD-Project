'use strict';
const repo = require('./investments.repository');
const { NotFoundError } = require('../../shared/errors');
const logger = require('../../shared/utils/logger');

/**
 * Enrich a raw investment row with computed P/L fields.
 * current_price falls back to buy_price when not set, so P/L = 0
 * until the user updates the current price.
 */
function withPL(inv) {
  const quantity = parseFloat(inv.quantity);
  const buyPrice = parseFloat(inv.buy_price);
  const currentPrice = inv.current_price != null ? parseFloat(inv.current_price) : buyPrice;

  const totalInvested = quantity * buyPrice;
  const currentValue = quantity * currentPrice;
  const profitLoss = currentValue - totalInvested;
  const profitLossPct = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

  return {
    ...inv,
    quantity: parseFloat(inv.quantity),
    buy_price: parseFloat(inv.buy_price),
    current_price: inv.current_price != null ? parseFloat(inv.current_price) : null,
    total_invested: parseFloat(totalInvested.toFixed(4)),
    current_value: parseFloat(currentValue.toFixed(4)),
    profit_loss: parseFloat(profitLoss.toFixed(4)),
    profit_loss_pct: parseFloat(profitLossPct.toFixed(2)),
  };
}

/**
 * Compute aggregate portfolio totals from an array of enriched investments.
 */
function portfolioSummary(enriched) {
  const totalInvested = enriched.reduce((s, i) => s + i.total_invested, 0);
  const currentValue = enriched.reduce((s, i) => s + i.current_value, 0);
  const profitLoss = currentValue - totalInvested;
  const profitLossPct = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

  return {
    total_invested: parseFloat(totalInvested.toFixed(4)),
    current_value: parseFloat(currentValue.toFixed(4)),
    profit_loss: parseFloat(profitLoss.toFixed(4)),
    profit_loss_pct: parseFloat(profitLossPct.toFixed(2)),
  };
}

async function getAll(userId) {
  const rows = await repo.findAllByUser(userId);
  const enriched = rows.map(withPL);
  return { investments: enriched, summary: portfolioSummary(enriched) };
}

async function getOne(userId, id) {
  const inv = await repo.findByIdAndUser(id, userId);
  if (!inv) throw new NotFoundError('Investment');
  return withPL(inv);
}

async function create(userId, data) {
  const payload = {
    user_id: userId,
    type: data.type,
    name: data.name,
    symbol: data.symbol || null,
    quantity: data.quantity,
    buy_price: data.buy_price,
    current_price: data.current_price != null ? data.current_price : null,
    currency: data.currency || 'INR',
    investment_date: data.investment_date,
    notes: data.notes || null,
  };

  const inv = await repo.create(payload);
  logger.info('Investment created', { userId, investmentId: inv.id, type: inv.type });
  return withPL(inv);
}

async function update(userId, id, data) {
  const existing = await repo.findByIdAndUser(id, userId);
  if (!existing) throw new NotFoundError('Investment');

  const inv = await repo.updateById(id, userId, data);
  return withPL(inv);
}

async function remove(userId, id) {
  const existing = await repo.findByIdAndUser(id, userId);
  if (!existing) throw new NotFoundError('Investment');
  await repo.deleteById(id, userId);
}

module.exports = { getAll, getOne, create, update, remove, withPL, portfolioSummary };
