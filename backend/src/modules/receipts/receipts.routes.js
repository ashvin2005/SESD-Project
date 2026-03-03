'use strict';
const express = require('express');
const { authenticate } = require('../../middleware/auth');
const { upload } = require('../../middleware/upload');
const controller = require('./receipts.controller');

const router = express.Router();
router.use(authenticate);

router.get('/', controller.getAll);
router.post('/', upload.single('receipt'), controller.upload);
router.get('/:id', controller.getOne);
router.get('/:id/file', controller.serveFile);
router.delete('/:id', controller.remove);

module.exports = router;
