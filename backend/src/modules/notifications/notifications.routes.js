'use strict';
const express = require('express');
const { authenticate } = require('../../middleware/auth');
const controller = require('./notifications.controller');

const router = express.Router();
router.use(authenticate);

router.get('/', controller.getAll);
router.patch('/read-all', controller.markAllRead);
router.delete('/all', controller.deleteAll);
router.patch('/:id/read', controller.markRead);
router.delete('/:id', controller.deleteOne);

module.exports = router;
