'use strict';
const categoryRepo = require('./categories.repository');
const { NotFoundError, ConflictError, BadRequestError } = require('../../shared/errors');

async function getAll(userId) {
  return categoryRepo.findAllByUser(userId);
}

async function create(userId, data) {

  const existing = await categoryRepo.findByNameTypeUser(data.name, data.type, userId);
  if (existing) {
    throw new ConflictError(`A ${data.type} category named "${data.name}" already exists.`);
  }
  return categoryRepo.create({ ...data, user_id: userId });
}

async function update(userId, categoryId, updates) {
  const category = await categoryRepo.findByIdAndUser(categoryId, userId);
  if (!category) throw new NotFoundError('Category');
  if (!category.is_active) throw new BadRequestError('Cannot update an inactive category.');


  if (updates.name && updates.name !== category.name) {
    const existing = await categoryRepo.findByNameTypeUser(updates.name, category.type, userId);
    if (existing) {
      throw new ConflictError(`A ${category.type} category named "${updates.name}" already exists.`);
    }
  }

  return categoryRepo.updateById(categoryId, userId, updates);
}

async function softDelete(userId, categoryId) {
  const category = await categoryRepo.findByIdAndUser(categoryId, userId);
  if (!category) throw new NotFoundError('Category');
  if (category.is_default) {
    throw new BadRequestError('Default categories cannot be deleted. You can rename or hide them.');
  }
  return categoryRepo.softDelete(categoryId, userId);
}

async function merge(userId, sourceId, targetId) {
  if (sourceId === targetId) {
    throw new BadRequestError('Source and target categories must be different.');
  }

  const [source, target] = await Promise.all([
    categoryRepo.findByIdAndUser(sourceId, userId),
    categoryRepo.findByIdAndUser(targetId, userId),
  ]);

  if (!source) throw new NotFoundError('Source category');
  if (!target) throw new NotFoundError('Target category');
  if (!target.is_active) throw new BadRequestError('Cannot merge into an inactive category.');
  if (source.type !== target.type) {
    throw new BadRequestError('Cannot merge categories of different types (income vs expense).');
  }

  return categoryRepo.mergeInto(sourceId, targetId, userId);
}

module.exports = { getAll, create, update, softDelete, merge };
