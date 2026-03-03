'use strict';
const path = require('path');
const receiptsService = require('./receipts.service');
const { successResponse } = require('../../shared/utils/response');
const { BadRequestError } = require('../../shared/errors');

async function upload(req, res, next) {
  try {
    if (!req.file) throw new BadRequestError('No file uploaded.');
    const receipt = await receiptsService.upload(req.user.id, req.file);
    res.status(201).json(successResponse({ receipt }));
  } catch (err) { next(err); }
}

async function getAll(req, res, next) {
  try {
    const receipts = await receiptsService.getAll(req.user.id);
    res.json(successResponse({ receipts }));
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const receipt = await receiptsService.getOne(req.user.id, req.params.id);
    res.json(successResponse({ receipt }));
  } catch (err) { next(err); }
}

async function serveFile(req, res, next) {
  try {
    const thumbnail = req.query.thumbnail === 'true';
    const { filePath, mimeType, fileName } = await receiptsService.getFilePath(req.user.id, req.params.id, thumbnail);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.sendFile(path.resolve(filePath));
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await receiptsService.remove(req.user.id, req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { upload, getAll, getOne, serveFile, remove };
