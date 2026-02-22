'use strict';
const crypto = require('crypto');


function generateSourceHash(userId, date, amount, currency, description) {
  const raw = `${userId}|${date}|${amount}|${currency.toUpperCase()}|${description.toLowerCase().trim()}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}


function getPeriodBounds(period, referenceDate = new Date()) {
  const date = new Date(referenceDate);

  if (period === 'monthly') {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return { start: toDateString(start), end: toDateString(end) };
  }

  if (period === 'weekly') {
    const day = date.getDay();
    const diffToMonday = (day === 0 ? -6 : 1 - day);
    const monday = new Date(date);
    monday.setDate(date.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { start: toDateString(monday), end: toDateString(sunday) };
  }

  if (period === 'yearly') {
    const start = new Date(date.getFullYear(), 0, 1);
    const end = new Date(date.getFullYear(), 11, 31);
    return { start: toDateString(start), end: toDateString(end) };
  }

  throw new Error(`Unknown period: ${period}`);
}


function toDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}


function getNextOccurrence(currentDate, frequency) {

  const [y, mo, d] = String(currentDate).split('-').map(Number);
  const date = new Date(y, mo - 1, d);

  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly': {
      const targetMonth = date.getMonth() + 1; 
      date.setMonth(targetMonth);

      if (date.getMonth() !== targetMonth % 12) {
        date.setDate(0); 
      }
      break;
    }
    case 'yearly': {
      const originalMonth = date.getMonth();
      date.setFullYear(date.getFullYear() + 1);

      if (date.getMonth() !== originalMonth) {
        date.setDate(0);
      }
      break;
    }
  }
  return toDateString(date);
}

module.exports = {
  generateSourceHash,
  getPeriodBounds,
  toDateString,
  getNextOccurrence,
};
