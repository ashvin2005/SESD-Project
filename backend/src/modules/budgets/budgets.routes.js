'use strict';
const express = require('express');
const { authenticate } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const controller = require('./budgets.controller');
const schemas = require('./budgets.validation');

const router = express.Router();
router.use(authenticate);

router.get('/', controller.getAll);
router.get('/summary', controller.getSummary);
router.get('/:id', validate(schemas.budgetIdParam), controller.getOne);
router.post('/', validate(schemas.createBudget), controller.create);
router.patch('/:id', validate(schemas.updateBudget), controller.update);
router.patch('/:id/deactivate', validate(schemas.budgetIdParam), controller.deactivate);
router.delete('/:id', validate(schemas.budgetIdParam), controller.remove);

module.exports = router;
