'use strict';
const path = require('path');
const importService = require('./import.service');
const { successResponse } = require('../../shared/utils/response');
const { BadRequestError } = require('../../shared/errors');

function isPDFFile(file) {
  return (
    file.mimetype === 'application/pdf' ||
    path.extname(file.originalname).toLowerCase() === '.pdf'
  );
}

async function preview(req, res, next) {
  try {
    if (!req.file) throw new BadRequestError('No file uploaded');
    const currency = req.body.currency || 'INR';

    const result = isPDFFile(req.file)
      ? await importService.previewPDFImport(req.user.id, req.file.buffer, currency)
      : await importService.previewImport(req.user.id, req.file.buffer.toString('utf8'), currency);

    res.json(successResponse(result));
  } catch (err) { next(err); }
}

async function confirm(req, res, next) {
  try {
    const { transactions, currency = 'INR' } = req.body;
    if (!Array.isArray(transactions) || transactions.length === 0) {
      throw new BadRequestError('transactions array is required');
    }
    const result = await importService.importTransactions(req.user.id, transactions, currency);
    res.json(successResponse(result));
  } catch (err) { next(err); }
}

module.exports = { preview, confirm };
