'use strict';
const recurringRepo = require('./recurring.repository');
const categoryRepo = require('../categories/categories.repository');
const { toSmallestUnit } = require('../../shared/utils/money');
const { getNextOccurrence } = require('../../shared/utils/dates');
const { NotFoundError, BadRequestError } = require('../../shared/errors');

async function getAll(userId) {
  return recurringRepo.findAllByUser(userId);
}

async function getOne(userId, ruleId) {
  const rule = await recurringRepo.findByIdAndUser(ruleId, userId);
  if (!rule) throw new NotFoundError('Recurring rule');
  return rule;
}

async function create(userId, data) {
  if (data.category_id) {
    const category = await categoryRepo.findByIdAndUser(data.category_id, userId);
    if (!category || !category.is_active) throw new NotFoundError('Category');
    if (category.type !== data.type) {
      throw new BadRequestError(`Category type mismatch.`);
    }
  }

  const template = {
    category_id: data.category_id || null,
    type: data.type,
    amount: data.amount, // store as user-facing decimal; job converts to smallest unit on create
    currency: data.currency || 'INR',
    description: data.description,
    notes: data.notes || null,
    tags: data.tags || [],
  };

  const rule = await recurringRepo.create({
    user_id: userId,
    template: JSON.stringify(template),
    frequency: data.frequency,
    next_occurrence: data.start_date,
    end_date: data.end_date || null,
  });

  return rule;
}

async function update(userId, ruleId, updates) {
  const rule = await recurringRepo.findByIdAndUser(ruleId, userId);
  if (!rule) throw new NotFoundError('Recurring rule');

  const updateData = {};
  if (updates.frequency) updateData.frequency = updates.frequency;
  if (updates.next_occurrence) updateData.next_occurrence = updates.next_occurrence;
  if (updates.end_date !== undefined) updateData.end_date = updates.end_date;
  if (updates.is_active !== undefined) updateData.is_active = updates.is_active;

  if (updates.template) {
    const existing = typeof rule.template === 'string' ? JSON.parse(rule.template) : rule.template;
    updateData.template = JSON.stringify({ ...existing, ...updates.template });
  }

  return recurringRepo.updateById(ruleId, userId, updateData);
}

async function remove(userId, ruleId) {
  const rule = await recurringRepo.findByIdAndUser(ruleId, userId);
  if (!rule) throw new NotFoundError('Recurring rule');
  await recurringRepo.deleteById(ruleId, userId);
}

module.exports = { getAll, getOne, create, update, remove };
