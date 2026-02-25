'use strict';
const authService = require('./auth.service');
const { successResponse } = require('../../shared/utils/response');
const config = require('../../config');

async function register(req, res, next) {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const user = await authService.getProfile(req.user.id);
    res.json(successResponse({ user }));
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const user = await authService.updateProfile(req.user.id, req.body);
    res.json(successResponse({ user }));
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    await authService.changePassword(req.user.id, req.body.current_password, req.body.new_password);
    res.json(successResponse({ message: 'Password changed successfully.' }));
  } catch (err) {
    next(err);
  }
}

async function refreshToken(req, res, next) {
  try {
    const result = await authService.refreshToken(req.body.refresh_token);
    res.json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

async function getPreferences(req, res, next) {
  try {
    const prefs = await authService.getPreferences(req.user.id);
    res.json(successResponse({ preferences: prefs }));
  } catch (err) {
    next(err);
  }
}

async function updatePreferences(req, res, next) {
  try {
    const prefs = await authService.updatePreferences(req.user.id, req.body);
    res.json(successResponse({ preferences: prefs }));
  } catch (err) {
    next(err);
  }
}


async function googleCallback(req, res, next) {
  try {
    const result = await authService.handleGoogleOAuth(req.user); // passport profile
    // Redirect to frontend with tokens as query params (simple demo approach)
    res.redirect(
      `${config.frontendUrl}/auth/oauth-callback?token=${result.token}&refresh_token=${result.refreshToken}`
    );
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, getMe, updateProfile, changePassword, refreshToken, getPreferences, updatePreferences, googleCallback };
