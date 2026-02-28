'use strict';
const txService = require('./transactions.service');
const { successResponse } = require('../../shared/utils/response');

async function list(req, res, next) {
  try {
    const result = await txService.list(req.user.id, req.query);
    res.json(successResponse(result.transactions, result.meta));
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const tx = await txService.getOne(req.user.id, req.params.id);
    res.json(successResponse({ transaction: tx }));
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const tx = await txService.create(req.user.id, req.body, req.user.base_currency);
    res.status(201).json(successResponse({ transaction: tx }));
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const tx = await txService.update(req.user.id, req.params.id, req.body, req.user.base_currency);
    res.json(successResponse({ transaction: tx }));
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await txService.remove(req.user.id, req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
}

async function bulkDelete(req, res, next) {
  try {
    await txService.bulkDelete(req.user.id, req.body.ids);
    res.json(successResponse({ message: `${req.body.ids.length} transactions deleted.` }));
  } catch (err) { next(err); }
}

async function bulkRecategorize(req, res, next) {
  try {
    await txService.bulkRecategorize(req.user.id, req.body.ids, req.body.category_id);
    res.json(successResponse({ message: `${req.body.ids.length} transactions recategorized.` }));
  } catch (err) { next(err); }
}

module.exports = { list, getOne, create, update, remove, bulkDelete, bulkRecategorize };
