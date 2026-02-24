'use strict';
const logger = require('../shared/utils/logger');
const { errorResponse } = require('../shared/utils/response');
const { AppError } = require('../shared/errors');
const config = require('../config');


function errorHandler(err, req, res, next) { 

  if (err.code === '23505') {
    return res.status(409).json(errorResponse('A record with this value already exists.', 'CONFLICT'));
  }


  if (err.code === '23503') {
    return res.status(422).json(errorResponse('Referenced record does not exist.', 'FOREIGN_KEY_VIOLATION'));
  }


  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json(errorResponse('Invalid or expired token.', 'UNAUTHENTICATED'));
  }


  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error('Operational error', { error: err.message, stack: err.stack, path: req.path });
    }
    return res.status(err.statusCode).json(errorResponse(err.message, err.code, err.details));
  }


  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  return res.status(500).json(
    errorResponse(
      config.env === 'production' ? 'An unexpected error occurred.' : err.message,
      'INTERNAL_ERROR'
    )
  );
}

module.exports = errorHandler;
