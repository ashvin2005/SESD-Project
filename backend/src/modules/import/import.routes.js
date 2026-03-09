'use strict';
const path = require('path');
const express = require('express');
const multer = require('multer');
const { authenticate } = require('../../middleware/auth');
const controller = require('./import.controller');

const ALLOWED_MIME_TYPES = new Set([
  'text/csv', 'application/csv', 'text/plain', 'application/vnd.ms-excel', 'application/pdf',
]);
const ALLOWED_EXTENSIONS = new Set(['.csv', '.pdf']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_MIME_TYPES.has(file.mimetype) || ALLOWED_EXTENSIONS.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and PDF bank statement files are supported'));
    }
  },
});

const router = express.Router();
router.use(authenticate);

router.post('/preview', upload.single('file'), controller.preview);
router.post('/confirm', controller.confirm);

module.exports = router;
