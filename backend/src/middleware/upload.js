'use strict';
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config');
const { UPLOAD_LIMITS } = require('../config/constants');
const { BadRequestError } = require('../shared/errors');


const uploadDir = config.storage.localDir;
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {

    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${req.user.id}-${Date.now()}-${safeName}`);
  },
});

function fileFilter(req, file, cb) {
  if (UPLOAD_LIMITS.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new BadRequestError(
        `File type not allowed. Accepted: ${UPLOAD_LIMITS.ALLOWED_MIME_TYPES.join(', ')}`
      ),
      false
    );
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: UPLOAD_LIMITS.FILE_SIZE_BYTES,
  },
});

module.exports = { upload };
