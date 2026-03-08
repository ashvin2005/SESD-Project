'use strict';
const express = require('express');
const { authenticate } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const controller = require('./investments.controller');
const schemas = require('./investments.validation');

const router = express.Router();
router.use(authenticate);

router.get('/', controller.getAll);
router.get('/:id', validate(schemas.investmentId), controller.getOne);
router.post('/', validate(schemas.createInvestment), controller.create);
router.put('/:id', validate(schemas.updateInvestment), controller.update);
router.delete('/:id', validate(schemas.investmentId), controller.remove);

module.exports = router;
