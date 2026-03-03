'use strict';
const fs = require('fs');
const path = require('path');
let sharp;
try { sharp = require('sharp'); } catch { sharp = null; }
const receiptsRepo = require('./receipts.repository');
const { NotFoundError } = require('../../shared/errors');
const { UPLOAD_LIMITS } = require('../../config/constants');
const logger = require('../../shared/utils/logger');


async function validateMagicBytes(filePath, mimeType) {
  const buffer = Buffer.alloc(8);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buffer, 0, 8, 0);
  fs.closeSync(fd);

  const hex = buffer.toString('hex');

  const signatures = {
    'image/jpeg': ['ffd8ff'],
    'image/png': ['89504e47'],
    'image/webp': ['52494646'], 
    'application/pdf': ['25504446'], 
  };

  const allowed = signatures[mimeType] || [];
  return allowed.some((sig) => hex.startsWith(sig));
}

async function upload(userId, file) {
  // Magic byte validation
  const isValid = await validateMagicBytes(file.path, file.mimetype);
  if (!isValid) {
    fs.unlinkSync(file.path); 
    throw new Error('File content does not match declared file type.');
  }

  let thumbnailPath = null;


  if (file.mimetype.startsWith('image/') && sharp) {
    try {
      thumbnailPath = file.path.replace(/(\.[^.]+)$/, '_thumb$1');
      await sharp(file.path)
        .resize(UPLOAD_LIMITS.THUMBNAIL_WIDTH, null, { withoutEnlargement: true })
        .toFile(thumbnailPath);
    } catch (err) {
      logger.warn('Thumbnail generation failed', { file: file.path, error: err.message });
      thumbnailPath = null;
    }
  }

  const receipt = await receiptsRepo.create({
    user_id: userId,
    file_path: file.path,
    file_name: file.originalname,
    mime_type: file.mimetype,
    file_size: file.size,
    thumbnail_path: thumbnailPath,
  });

  logger.info('Receipt uploaded', { userId, receiptId: receipt.id, size: file.size });
  return receipt;
}

async function getOne(userId, receiptId) {
  const receipt = await receiptsRepo.findByIdAndUser(receiptId, userId);
  if (!receipt) throw new NotFoundError('Receipt');
  return receipt;
}

async function getAll(userId) {
  return receiptsRepo.findAllByUser(userId);
}

async function remove(userId, receiptId) {
  const receipt = await receiptsRepo.findByIdAndUser(receiptId, userId);
  if (!receipt) throw new NotFoundError('Receipt');


  [receipt.file_path, receipt.thumbnail_path].forEach((fp) => {
    if (fp && fs.existsSync(fp)) {
      try { fs.unlinkSync(fp); } catch (e) { /* ignore */ }
    }
  });

  await receiptsRepo.deleteById(receiptId, userId);
  logger.info('Receipt deleted', { userId, receiptId });
}


async function getFilePath(userId, receiptId, thumbnail = false) {
  const receipt = await receiptsRepo.findByIdAndUser(receiptId, userId);
  if (!receipt) throw new NotFoundError('Receipt');

  const filePath = thumbnail && receipt.thumbnail_path ? receipt.thumbnail_path : receipt.file_path;
  if (!fs.existsSync(filePath)) throw new NotFoundError('Receipt file');

  return { filePath, mimeType: receipt.mime_type, fileName: receipt.file_name };
}

module.exports = { upload, getOne, getAll, remove, getFilePath };
