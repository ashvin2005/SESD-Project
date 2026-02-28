'use strict';
const txRepo = require('./transactions.repository');
const categoryRepo = require('../categories/categories.repository');
const { toSmallestUnit, fromSmallestUnit, convertCurrency } = require('../../shared/utils/money');
const { generateSourceHash } = require('../../shared/utils/dates');
const { NotFoundError, BadRequestError, AuthorizationError } = require('../../shared/errors');
const exchangeRateService = require('../reports/exchangeRate.service');
const { PAGINATION } = require('../../config/constants');
const logger = require('../../shared/utils/logger');

async function list(userId, rawFilters) {
  const limit = Math.min(rawFilters.limit || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
  const cursor = rawFilters.cursor || null;
  const filters = { ...rawFilters };

  const [{ data, nextCursor }, total] = await Promise.all([
    txRepo.findAll(userId, filters, limit, cursor),
    txRepo.countAll(userId, filters),
  ]);

  return { transactions: data, meta: { total, limit, next_cursor: nextCursor } };
}

async function getOne(userId, txId) {
  const tx = await txRepo.findByIdAndUser(txId, userId);
  if (!tx) throw new NotFoundError('Transaction');
  return tx;
}

async function create(userId, data, userBaseCurrency) {

  if (data.category_id) {
    const category = await categoryRepo.findByIdAndUser(data.category_id, userId);
    if (!category) throw new NotFoundError('Category');
    if (!category.is_active) throw new BadRequestError('Cannot use an inactive category.');
    if (category.type !== data.type) {
      throw new BadRequestError(
        `Category type mismatch: category is "${category.type}" but transaction type is "${data.type}".`
      );
    }
  }


  if (data.type === 'income' && data.amount < 0) {
    throw new BadRequestError('Income transactions must have a positive amount.');
  }

  const amountInSmallest = toSmallestUnit(data.amount, data.currency);
  const currency = data.currency || 'INR';


  let amountInBase = amountInSmallest;
  let exchangeRate = 1;
  if (currency !== userBaseCurrency) {
    const rate = await exchangeRateService.getRate(currency, userBaseCurrency);
    amountInBase = convertCurrency(amountInSmallest, currency, userBaseCurrency, rate);
    exchangeRate = rate;
  }

  const txData = {
    user_id: userId,
    category_id: data.category_id || null,
    type: data.type,
    amount: amountInSmallest,
    currency,
    amount_in_base: amountInBase,
    exchange_rate: exchangeRate,
    description: data.description.trim(),
    notes: data.notes || null,
    transaction_date: data.transaction_date,
    is_recurring: data.is_recurring || false,
    tags: data.tags || [],
  };

  const tx = await txRepo.create(txData);
  logger.info('Transaction created', { userId, txId: tx.id, type: data.type, amount: amountInSmallest });
  return tx;
}

async function update(userId, txId, updates, userBaseCurrency) {
  const existing = await txRepo.findByIdAndUser(txId, userId);
  if (!existing) throw new NotFoundError('Transaction');


  if (updates.category_id !== undefined && updates.category_id !== null) {
    const category = await categoryRepo.findByIdAndUser(updates.category_id, userId);
    if (!category) throw new NotFoundError('Category');
    if (!category.is_active) throw new BadRequestError('Cannot use an inactive category.');
    if (category.type !== existing.type) {
      throw new BadRequestError(
        `Category type mismatch: category is "${category.type}" but transaction type is "${existing.type}".`
      );
    }
  }


  if (existing.type === 'income' && updates.amount !== undefined && updates.amount < 0) {
    throw new BadRequestError('Income transactions must have a positive amount.');
  }

  const updateData = { ...updates };


  if (updates.amount !== undefined || updates.currency) {

    const existingDecimal = fromSmallestUnit(existing.amount, existing.currency);
    const newAmount = updates.amount !== undefined ? updates.amount : existingDecimal;
    const newCurrency = updates.currency || existing.currency;
    const amountInSmallest = toSmallestUnit(newAmount, newCurrency);
    updateData.amount = amountInSmallest;

    if (newCurrency !== userBaseCurrency) {
      const rate = await exchangeRateService.getRate(newCurrency, userBaseCurrency);
      updateData.amount_in_base = convertCurrency(amountInSmallest, newCurrency, userBaseCurrency, rate);
      updateData.exchange_rate = rate;
    } else {
      updateData.amount_in_base = amountInSmallest;
      updateData.exchange_rate = 1;
    }
  }

  return txRepo.updateById(txId, userId, updateData);
}

async function remove(userId, txId) {
  const existing = await txRepo.findByIdAndUser(txId, userId);
  if (!existing) throw new NotFoundError('Transaction');
  await txRepo.deleteById(txId, userId);
}

async function bulkDelete(userId, ids) {
  await txRepo.bulkDelete(ids, userId);
}

async function bulkRecategorize(userId, ids, categoryId) {
  const category = await categoryRepo.findByIdAndUser(categoryId, userId);
  if (!category) throw new NotFoundError('Category');
  if (!category.is_active) throw new BadRequestError('Cannot use an inactive category.');
  await txRepo.bulkRecategorize(ids, userId, categoryId);
}

module.exports = { list, getOne, create, update, remove, bulkDelete, bulkRecategorize };
