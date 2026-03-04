'use strict';
const sgMail = require('@sendgrid/mail');
const config = require('../../config');
const logger = require('../../shared/utils/logger');

const EMAIL_ENABLED = Boolean(
  config.sendgrid.apiKey &&
  config.sendgrid.apiKey.startsWith('SG.') &&
  !config.sendgrid.apiKey.startsWith('SG.your-')
);

if (EMAIL_ENABLED) {
  sgMail.setApiKey(config.sendgrid.apiKey);
  logger.info('Email service: SendGrid ready', { from: config.sendgrid.fromEmail });
} else {
  logger.warn('Email service: disabled (SENDGRID_API_KEY not configured). Budget alert emails will not be sent.');
}

async function sendEmail({ to, subject, text, html }) {
  if (!EMAIL_ENABLED) {
    logger.debug('Email skipped — SendGrid not configured', { to, subject });
    return;
  }

  await sgMail.send({
    to,
    from: { email: config.sendgrid.fromEmail, name: config.sendgrid.fromName },
    subject,
    text,
    html: html || `<p>${text}</p>`,
  });

  logger.info('Email sent', { to, subject });
}

async function sendNotificationEmail(to, title, message) {
  return sendEmail({
    to,
    subject: `Finance Tracker: ${title}`,
    text: message,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937;">${title}</h2>
        <p style="color: #4b5563;">${message}</p>
        <hr style="border-color: #e5e7eb;" />
        <p style="color: #9ca3af; font-size: 12px;">
          You received this because email notifications are enabled in your Finance Tracker account.
        </p>
      </div>
    `,
  });
}

async function sendWelcomeEmail(to, name) {
  return sendEmail({
    to,
    subject: 'Welcome to Finance Tracker!',
    text: `Hi ${name}, welcome to Finance Tracker! Start by adding your first transaction.`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937;">Welcome, ${name}!</h2>
        <p style="color: #4b5563;">
          Your Finance Tracker account is ready. Start by adding your first transaction to begin
          tracking your income and expenses.
        </p>
        <hr style="border-color: #e5e7eb;" />
        <p style="color: #9ca3af; font-size: 12px;">Finance Tracker — Personal Finance Made Simple</p>
      </div>
    `,
  });
}

module.exports = { sendEmail, sendNotificationEmail, sendWelcomeEmail };
