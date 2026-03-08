'use strict';
const service = require('./investments.service');
const { successResponse } = require('../../shared/utils/response');

async function getAll(req, res, next) {
  try {
    const result = await service.getAll(req.user.id);
    res.json(successResponse(result));
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const investment = await service.getOne(req.user.id, req.params.id);
    res.json(successResponse({ investment }));
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const investment = await service.create(req.user.id, req.body);
    res.status(201).json(successResponse({ investment }));
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const investment = await service.update(req.user.id, req.params.id, req.body);
    res.json(successResponse({ investment }));
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await service.remove(req.user.id, req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { getAll, getOne, create, update, remove };
