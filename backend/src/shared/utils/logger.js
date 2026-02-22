'use strict';
const winston = require('winston');
const config = require('../../config/index');

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

const logger = winston.createLogger({
  level: config.env === 'production' ? 'info' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: { service: 'finance-tracker' },
  transports: [
    new winston.transports.Console({
      format:
        config.env === 'production'
          ? combine(timestamp(), errors({ stack: true }), json())
          : combine(colorize(), simple()),
    }),
  ],
});


if (config.env === 'production') {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, 
      maxFiles: 5,
    })
  );
  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10485760, 
      maxFiles: 5,
    })
  );
}

module.exports = logger;
