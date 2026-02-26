'use strict';
const categoryService = require('./categories.service');
const { successResponse } = require('../../shared/utils/response');

async function getAll(req, res, next) {
  try {
    const categories = await categoryService.getAll(req.user.id);
    res.json(successResponse({ categories }));
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const category = await categoryService.create(req.user.id, req.body);
    res.status(201).json(successResponse({ category }));
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const category = await categoryService.update(req.user.id, req.params.id, req.body);
    res.json(successResponse({ category }));
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await categoryService.softDelete(req.user.id, req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
}

async function merge(req, res, next) {
  try {
    const result = await categoryService.merge(req.user.id, req.params.id, req.body.target_category_id);
    res.json(successResponse({ message: 'Categories merged successfully.', category: result }));
  } catch (err) { next(err); }
}

module.exports = { getAll, create, update, remove, merge };
