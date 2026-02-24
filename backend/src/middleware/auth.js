'use strict';
const jwt = require('jsonwebtoken');
const config = require('../config');
const { AuthenticationError, AuthorizationError } = require('../shared/errors');
const { db } = require('../config/database');


async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);


    const user = await db('users')
      .where({ id: decoded.sub })
      .select('id', 'email', 'name', 'auth_provider', 'base_currency', 'email_verified')
      .first();

    if (!user) {
      throw new AuthenticationError('User no longer exists');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}


async function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  return authenticate(req, res, next);
}


function requireOwnership(paramName = 'userId') {
  return (req, res, next) => {
    if (req.params[paramName] && req.params[paramName] !== req.user.id) {
      return next(new AuthorizationError());
    }
    next();
  };
}

module.exports = { authenticate, optionalAuthenticate, requireOwnership };
