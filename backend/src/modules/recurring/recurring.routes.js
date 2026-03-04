'use strict';
const express = require('express');
const { authenticate } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const controller = require('./recurring.controller');
const schemas = require('./recurring.validation');

const router = express.Router();
router.use(authenticate);

router.get('/', controller.getAll);
router.post('/', validate(schemas.createRule), controller.create);
router.get('/:id', validate(schemas.ruleIdParam), controller.getOne);
router.patch('/:id', validate(schemas.updateRule), controller.update);
router.delete('/:id', validate(schemas.ruleIdParam), controller.remove);

module.exports = router;
