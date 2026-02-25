'use strict';
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../config');
const { db } = require('../../config/database');
const authRepo = require('./auth.repository');
const { ConflictError, AuthenticationError, BadRequestError } = require('../../shared/errors');
const logger = require('../../shared/utils/logger');

function generateToken(userId) {
  return jwt.sign({ sub: userId }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
}

function generateRefreshToken(userId) {
  return jwt.sign({ sub: userId, type: 'refresh' }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
}

async function register(data) {
  const existing = await authRepo.findByEmail(data.email);
  if (existing) {
    throw new ConflictError('An account with this email already exists.');
  }

  const password_hash = await bcrypt.hash(data.password, config.bcrypt.saltRounds);

  const user = await authRepo.create({
    email: data.email,
    password_hash,
    name: data.name,
    auth_provider: 'local',
    base_currency: data.base_currency || 'INR',
  });

  logger.info('User registered', { userId: user.id });
  const token = generateToken(user.id);
  const refreshToken = generateRefreshToken(user.id);
  return { user, token, refreshToken };
}

async function login(email, password) {
  const user = await authRepo.findByEmail(email);
  if (!user) {

    await bcrypt.hash(password, config.bcrypt.saltRounds);
    throw new AuthenticationError('Invalid email or password.');
  }

  if (!user.password_hash) {
    throw new AuthenticationError('This account uses Google Sign-In. Please login with Google.');
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    throw new AuthenticationError('Invalid email or password.');
  }

  logger.info('User logged in', { userId: user.id });
  const token = generateToken(user.id);
  const refreshToken = generateRefreshToken(user.id);


  const { password_hash: _, ...safeUser } = user;
  return { user: safeUser, token, refreshToken };
}

async function getProfile(userId) {
  const user = await authRepo.findById(userId);
  if (!user) throw new AuthenticationError('User not found.');
  return user;
}

async function updateProfile(userId, updates) {
  return authRepo.updateById(userId, updates);
}

async function changePassword(userId, currentPassword, newPassword) {
  const { email } = await authRepo.findById(userId);
  const user = await authRepo.findByEmail(email);

  if (!user.password_hash) {
    throw new BadRequestError('OAuth accounts cannot change passwords here.');
  }

  const isValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isValid) {
    throw new AuthenticationError('Current password is incorrect.');
  }

  const password_hash = await bcrypt.hash(newPassword, config.bcrypt.saltRounds);
  await authRepo.updateById(userId, { password_hash });
  logger.info('User changed password', { userId });
}


async function handleGoogleOAuth(profile) {
  const email = profile.emails[0].value.toLowerCase();
  const googleId = profile.id;
  const name = profile.displayName;
  const avatarUrl = profile.photos?.[0]?.value || null;


  let user = await authRepo.findByGoogleId(googleId);
  if (user) {
    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    return { user, token, refreshToken, isNew: false };
  }


  const existing = await authRepo.findByEmail(email);
  if (existing) {

    user = await authRepo.linkGoogleAccount(existing.id, googleId, avatarUrl);
    logger.info('Google account linked to existing user', { userId: existing.id });
    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    return { user, token, refreshToken, isNew: false };
  }


  user = await authRepo.create({
    email,
    name,
    auth_provider: 'google',
    google_id: googleId,
    avatar_url: avatarUrl,
    email_verified: true,
    base_currency: 'INR',
  });

  logger.info('New user via Google OAuth', { userId: user.id });
  const token = generateToken(user.id);
  const refreshToken = generateRefreshToken(user.id);
  return { user, token, refreshToken, isNew: true };
}

async function refreshToken(token) {
  let decoded;
  try {
    decoded = jwt.verify(token, config.jwt.refreshSecret);
  } catch (err) {
    throw new AuthenticationError('Invalid or expired refresh token.');
  }
  if (decoded.type !== 'refresh') throw new AuthenticationError('Invalid token type.');

  const user = await authRepo.findById(decoded.sub);
  if (!user) throw new AuthenticationError('User not found.');

  return {
    token: generateToken(user.id),
    refreshToken: generateRefreshToken(user.id),
  };
}

async function getPreferences(userId) {
  return db('user_preferences').where({ user_id: userId }).first();
}

async function updatePreferences(userId, updates) {
  const [prefs] = await db('user_preferences')
    .where({ user_id: userId })
    .update({ ...updates, updated_at: db.fn.now() })
    .returning('*');
  return prefs;
}

module.exports = {
  register, login, getProfile, updateProfile, changePassword,
  refreshToken, getPreferences, updatePreferences, handleGoogleOAuth,
};
