'use strict';
const budgetsService = require('./budgets.service');
const { successResponse } = require('../../shared/utils/response');

async function getAll(req, res, next) {
  try {
    const budgets = await budgetsService.getAll(req.user.id);
    res.json(successResponse({ budgets }));
  } catch (err) { next(err); }
}

async function getSummary(req, res, next) {
  try {
    const summary = await budgetsService.getSummary(req.user.id);
    res.json(successResponse({ budgets: summary }));
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const budget = await budgetsService.getOne(req.user.id, req.params.id);
    res.json(successResponse({ budget }));
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const budget = await budgetsService.create(req.user.id, req.body);
    res.status(201).json(successResponse({ budget }));
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const budget = await budgetsService.update(req.user.id, req.params.id, req.body);
    res.json(successResponse({ budget }));
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await budgetsService.remove(req.user.id, req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
}

async function deactivate(req, res, next) {
  try {
    const budget = await budgetsService.deactivate(req.user.id, req.params.id);
    res.json(successResponse({ budget, message: 'Budget deactivated.' }));
  } catch (err) { next(err); }
}

module.exports = { getAll, getSummary, getOne, create, update, remove, deactivate };
