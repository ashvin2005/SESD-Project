'use strict';
const chatService = require('./chat.service');
const { successResponse } = require('../../shared/utils/response');
const { BadRequestError } = require('../../shared/errors');

async function message(req, res, next) {
  try {
    const { message: userMessage, history = [] } = req.body;
    if (!userMessage || !userMessage.trim()) {
      throw new BadRequestError('message is required');
    }
    const result = await chatService.processChat(req.user.id, userMessage.trim(), history);
    res.json(successResponse({ reply: result.reply }));
  } catch (err) { next(err); }
}

module.exports = { message };
