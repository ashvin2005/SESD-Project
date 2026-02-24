'use strict';
const { ValidationError } = require('../shared/errors');

/**
 * Factory function that returns an Express middleware to validate
 * request data against a Joi schema.
 *
 * @param {object} schema - Joi schema with optional keys: body, query, params
 * @param {object} options - Joi validation options
 */
function validate(schema, options = {}) {
  const joiOptions = { abortEarly: false, stripUnknown: true, ...options };

  return (req, res, next) => {
    const errors = [];

    if (schema.body) {
      const { error, value } = schema.body.validate(req.body, joiOptions);
      if (error) {
        errors.push(...error.details.map((d) => ({ field: d.path.join('.'), message: d.message })));
      } else {
        req.body = value; 
      }
    }

    if (schema.query) {
      const { error, value } = schema.query.validate(req.query, joiOptions);
      if (error) {
        errors.push(...error.details.map((d) => ({ field: d.path.join('.'), message: d.message })));
      } else {
        Object.assign(req.query, value);
      }
    }

    if (schema.params) {
      const { error, value } = schema.params.validate(req.params, joiOptions);
      if (error) {
        errors.push(...error.details.map((d) => ({ field: d.path.join('.'), message: d.message })));
      } else {
        Object.assign(req.params, value);
      }
    }

    if (errors.length > 0) {
      return next(new ValidationError('Validation failed', errors));
    }

    next();
  };
}

module.exports = { validate };
