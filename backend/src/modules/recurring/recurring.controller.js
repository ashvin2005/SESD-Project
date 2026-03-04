'use strict';
const recurringService = require('./recurring.service');
const { successResponse } = require('../../shared/utils/response');

async function getAll(req, res, next) {
  try {
    const rules = await recurringService.getAll(req.user.id);
    res.json(successResponse({ recurring_rules: rules }));
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const rule = await recurringService.getOne(req.user.id, req.params.id);
    res.json(successResponse({ recurring_rule: rule }));
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const rule = await recurringService.create(req.user.id, req.body);
    res.status(201).json(successResponse({ recurring_rule: rule }));
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const rule = await recurringService.update(req.user.id, req.params.id, req.body);
    res.json(successResponse({ recurring_rule: rule }));
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await recurringService.remove(req.user.id, req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { getAll, getOne, create, update, remove };
