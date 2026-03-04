'use strict';
const notificationsService = require('./notifications.service');
const { successResponse } = require('../../shared/utils/response');

async function getAll(req, res, next) {
  try {
    const { unread, limit, offset } = req.query;
    const result = await notificationsService.getAll(req.user.id, {
      unread: unread === 'true',
      limit: parseInt(limit, 10) || 20,
      offset: parseInt(offset, 10) || 0,
    });
    res.json(successResponse(result));
  } catch (err) { next(err); }
}

async function markRead(req, res, next) {
  try {
    const notification = await notificationsService.markRead(req.user.id, req.params.id);
    res.json(successResponse({ notification }));
  } catch (err) { next(err); }
}

async function markAllRead(req, res, next) {
  try {
    await notificationsService.markAllRead(req.user.id);
    res.json(successResponse({ message: 'All notifications marked as read.' }));
  } catch (err) { next(err); }
}

async function deleteOne(req, res, next) {
  try {
    await notificationsService.deleteOne(req.user.id, req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
}

async function deleteAll(req, res, next) {
  try {
    await notificationsService.deleteAll(req.user.id);
    res.json(successResponse({ message: 'All notifications deleted.' }));
  } catch (err) { next(err); }
}

module.exports = { getAll, markRead, markAllRead, deleteOne, deleteAll };
