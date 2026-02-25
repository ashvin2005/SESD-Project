'use strict';
const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const authController = require('./auth.controller');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const { authLimiter } = require('../../middleware/rateLimiter');
const schemas = require('./auth.validation');
const config = require('../../config');
const logger = require('../../shared/utils/logger');

const router = express.Router();

const GOOGLE_OAUTH_ENABLED = Boolean(
  config.google.clientId &&
  config.google.clientId !== 'your-google-client-id' &&
  config.google.clientSecret &&
  config.google.clientSecret !== 'your-google-client-secret'
);

if (GOOGLE_OAUTH_ENABLED) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.google.clientId,
        clientSecret: config.google.clientSecret,
        callbackURL: config.google.callbackUrl,
      },
      async (accessToken, refreshToken, profile, done) => {
        done(null, profile);
      }
    )
  );
  logger.info('Google OAuth: enabled');
} else {
  logger.warn('Google OAuth: disabled (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not configured)');
}

function oauthNotConfigured(req, res) {
  res.status(503).json({
    success: false,
    error: {
      code: 'OAUTH_NOT_CONFIGURED',
      message: 'Google OAuth is not enabled on this server. Use email/password login instead.',
    },
  });
}

router.post('/register', authLimiter, validate(schemas.register), authController.register);
router.post('/login', authLimiter, validate(schemas.login), authController.login);
router.post('/refresh', validate(schemas.refreshToken), authController.refreshToken);
router.get('/me', authenticate, authController.getMe);
router.patch('/profile', authenticate, validate(schemas.updateProfile), authController.updateProfile);
router.patch('/change-password', authenticate, authLimiter, validate(schemas.changePassword), authController.changePassword);
router.get('/preferences', authenticate, authController.getPreferences);
router.patch('/preferences', authenticate, validate(schemas.updatePreferences), authController.updatePreferences);

if (GOOGLE_OAUTH_ENABLED) {
  router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
  router.get(
    '/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/auth?error=oauth_failed' }),
    authController.googleCallback
  );
} else {
  router.get('/google', oauthNotConfigured);
  router.get('/google/callback', oauthNotConfigured);
}

module.exports = router;
