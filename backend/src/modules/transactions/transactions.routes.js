'use strict';
const express = require('express');
const { authenticate } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const controller = require('./transactions.controller');
const schemas = require('./transactions.validation');

const router = express.Router();
router.use(authenticate);

router.get('/', validate(schemas.listTransactions), controller.list);
router.post('/', validate(schemas.createTransaction), controller.create);
router.post('/bulk-delete', validate(schemas.bulkDelete), controller.bulkDelete);
router.post('/bulk-recategorize', validate(schemas.bulkRecategorize), controller.bulkRecategorize);
router.get('/:id', validate(schemas.transactionIdParam), controller.getOne);
router.patch('/:id', validate(schemas.updateTransaction), controller.update);
router.delete('/:id', validate(schemas.transactionIdParam), controller.remove);

module.exports = router;
