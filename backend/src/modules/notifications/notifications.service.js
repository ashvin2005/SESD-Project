'use strict';
const notificationsRepo = require('./notifications.repository');
const { NotFoundError } = require('../../shared/errors');
const { NOTIFICATION_TYPES } = require('../../config/constants');
const emailService = require('./email.service');
const logger = require('../../shared/utils/logger');

async function getAll(userId, { unread, limit, offset } = {}) {
  const [notifications, unreadCount] = await Promise.all([
    notificationsRepo.findAllByUser(userId, { unread, limit, offset }),
    notificationsRepo.countUnread(userId),
  ]);
  return { notifications, unread_count: unreadCount };
}

async function markRead(userId, notificationId) {
  const notification = await notificationsRepo.markRead(notificationId, userId);
  if (!notification) throw new NotFoundError('Notification');
  return notification;
}

async function markAllRead(userId) {
  await notificationsRepo.markAllRead(userId);
}

async function deleteOne(userId, notificationId) {
  await notificationsRepo.deleteById(notificationId, userId);
}

async function deleteAll(userId) {
  await notificationsRepo.deleteAllByUser(userId);
}


async function createNotification(userId, { type, title, message, metadata = null, sendEmail = false, userEmail = null }) {
  const notification = await notificationsRepo.create({
    user_id: userId,
    type,
    title,
    message,
    metadata: metadata ? JSON.stringify(metadata) : null,
  });

  if (sendEmail && userEmail) {
    try {
      await emailService.sendNotificationEmail(userEmail, title, message);
      await notificationsRepo.markSentViaEmail(notification.id);
    } catch (err) {
      logger.warn('Failed to send notification email', { userId, error: err.message });
    }
  }

  logger.info('Notification created', { userId, type, notificationId: notification.id });
  return notification;
}


async function sendBudgetAlert(userId, budget, percentage, { userEmail, emailEnabled } = {}) {
  const alreadySent = await notificationsRepo.hasBudgetAlertToday(userId, budget.id);
  if (alreadySent) return null;

  const exceeded = percentage >= 100;
  const type = exceeded ? NOTIFICATION_TYPES.BUDGET_EXCEEDED : NOTIFICATION_TYPES.BUDGET_WARNING;
  const categoryLabel = budget.category_name || 'Overall';
  const title = exceeded
    ? `Budget Exceeded: ${categoryLabel}`
    : `Budget Alert: ${categoryLabel} at ${percentage}%`;
  const message = exceeded
    ? `Your ${budget.period} budget for "${categoryLabel}" has been exceeded (${percentage}% used).`
    : `You've used ${percentage}% of your ${budget.period} budget for "${categoryLabel}". ${100 - percentage}% remaining.`;

  return createNotification(userId, {
    type,
    title,
    message,
    metadata: { budget_id: budget.id, percentage, category_name: categoryLabel },
    sendEmail: emailEnabled,
    userEmail,
  });
}

module.exports = { getAll, markRead, markAllRead, deleteOne, deleteAll, createNotification, sendBudgetAlert };
