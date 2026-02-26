'use strict';
const express = require('express');
const { authenticate } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const controller = require('./categories.controller');
const schemas = require('./categories.validation');

const router = express.Router();
router.use(authenticate);

router.get('/', controller.getAll);
router.post('/', validate(schemas.createCategory), controller.create);
router.patch('/:id', validate(schemas.updateCategory), controller.update);
router.delete('/:id', validate(schemas.categoryIdParam), controller.remove);
router.post('/:id/merge', validate(schemas.mergeCategory), controller.merge);

module.exports = router;
