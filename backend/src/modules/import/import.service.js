'use strict';
const crypto = require('crypto');
const { db } = require('../../config/database');
const { toSmallestUnit } = require('../../shared/utils/money');
const { chatJSON } = require('../../shared/utils/groqClient');
const logger = require('../../shared/utils/logger');
const { parsePDF } = require('./pdfParser');


function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim().toLowerCase());


  const colAliases = {
    date: ['date', 'transaction date', 'txn date', 'value date', 'posting date'],
    description: ['description', 'narration', 'particulars', 'details', 'remarks', 'payee'],
    amount: ['amount', 'transaction amount', 'txn amount', 'debit/credit', 'net amount'],
    debit: ['debit', 'debit amount', 'withdrawal', 'dr'],
    credit: ['credit', 'credit amount', 'deposit', 'cr'],
    balance: ['balance', 'closing balance', 'available balance'],
  };

  function findCol(aliases) {
    return aliases.findIndex((a) => headers.some((h, i) => h === a && (findCol._map = i) >= 0) && findCol._map >= 0)
      || aliases.reduce((found, a) => found >= 0 ? found : headers.indexOf(a), -1);
  }

  const idxDate = colAliases.date.reduce((f, a) => f >= 0 ? f : headers.indexOf(a), -1);
  const idxDesc = colAliases.description.reduce((f, a) => f >= 0 ? f : headers.indexOf(a), -1);
  const idxAmt = colAliases.amount.reduce((f, a) => f >= 0 ? f : headers.indexOf(a), -1);
  const idxDebit = colAliases.debit.reduce((f, a) => f >= 0 ? f : headers.indexOf(a), -1);
  const idxCredit = colAliases.credit.reduce((f, a) => f >= 0 ? f : headers.indexOf(a), -1);

  const rows = [];
  for (let i = 1; i < lines.length; i++) {

    const cols = lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim());
    const clean = (idx) => (cols[idx] != null ? cols[idx] : '');

    const rawDate = idxDate >= 0 ? clean(idxDate) : '';
    const description = idxDesc >= 0 ? clean(idxDesc) : `Row ${i}`;

    let amount = 0;
    let type = 'expense';

    if (idxDebit >= 0 || idxCredit >= 0) {
      const debit = parseFloat(clean(idxDebit).replace(/[^0-9.-]/g, '')) || 0;
      const credit = parseFloat(clean(idxCredit).replace(/[^0-9.-]/g, '')) || 0;
      if (credit > 0) { amount = credit; type = 'income'; }
      else if (debit > 0) { amount = debit; type = 'expense'; }
    } else if (idxAmt >= 0) {
      const raw = clean(idxAmt).replace(/[^0-9.-]/g, '');
      const num = parseFloat(raw) || 0;
      if (num < 0) { amount = Math.abs(num); type = 'expense'; }
      else { amount = num; type = 'income'; }
    }

    if (!rawDate || amount === 0) continue;


    let date = rawDate;
    const dmatch = rawDate.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (dmatch) {
      const [, d, m, y] = dmatch;
      const year = y.length === 2 ? `20${y}` : y;
      date = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    rows.push({ date, description, amount, type });
  }
  return rows;
}


async function categorizeBatch(transactions, userCategories) {
  if (!userCategories || userCategories.length === 0) return transactions;

  const catList = userCategories.map((c) => `${c.name} (${c.type})`).join(', ');
  const txList = transactions.map((t, i) => `${i}: "${t.description}" type=${t.type} amount=${t.amount}`).join('\n');

  const system = `You are a finance categorization assistant. Assign the best category from the provided list to each transaction.
Respond ONLY with a valid JSON array, no markdown.`;

  const user = `Available categories: ${catList}

Transactions to categorize:
${txList}

Return a JSON array where each element is {"index": <number>, "category": "<exact category name from list>"}
Return the array for ALL ${transactions.length} transactions.`;

  try {
    const result = await chatJSON({ system, user, temperature: 0.1, maxTokens: 1024 });
    const mapped = Array.isArray(result) ? result : (result.categories || []);

    return transactions.map((tx, i) => {
      const match = mapped.find((m) => m.index === i);
      const category = userCategories.find((c) => c.name === match?.category);
      return { ...tx, category_id: category?.id || null, suggested_category: match?.category || null };
    });
  } catch (err) {
    logger.warn('Batch categorization failed', { error: err.message });
    return transactions.map((tx) => ({ ...tx, category_id: null, suggested_category: null }));
  }
}


function computeHash(userId, date, description, amount) {
  return crypto
    .createHash('sha256')
    .update(`${userId}|${date}|${description.toLowerCase().trim()}|${Math.round(amount * 100)}`)
    .digest('hex')
    .slice(0, 32);
}


async function _processRows(userId, rows, currency) {
  const userCategories = await db('categories')
    .where({ user_id: userId, is_active: true })
    .select('id', 'name', 'type');

  const expenseCategories = userCategories.filter((c) => c.type === 'expense');
  const incomeCategories = userCategories.filter((c) => c.type === 'income');

  const expenses = rows.filter((t) => t.type === 'expense');
  const incomes = rows.filter((t) => t.type === 'income');

  const [categorizedExpenses, categorizedIncomes] = await Promise.all([
    expenses.length > 0 ? categorizeBatch(expenses, expenseCategories) : [],
    incomes.length > 0 ? categorizeBatch(incomes, incomeCategories) : [],
  ]);

  const all = [...categorizedExpenses, ...categorizedIncomes];

  const hashes = all.map((t) => computeHash(userId, t.date, t.description, t.amount));
  const existingHashes = await db('transactions')
    .whereIn('source_hash', hashes)
    .where('user_id', userId)
    .pluck('source_hash');

  const existingSet = new Set(existingHashes);

  const preview = all.map((t, i) => ({
    ...t,
    source_hash: hashes[i],
    is_duplicate: existingSet.has(hashes[i]),
    currency,
  }));

  return {
    transactions: preview,
    total: preview.length,
    duplicates: preview.filter((t) => t.is_duplicate).length,
  };
}

async function previewImport(userId, csvText, currency = 'INR') {
  const parsed = parseCSV(csvText);
  if (parsed.length === 0) return { transactions: [], total: 0, duplicates: 0 };
  return _processRows(userId, parsed, currency);
}

async function previewPDFImport(userId, buffer, currency = 'INR') {
  const rows = await parsePDF(buffer);
  return _processRows(userId, rows, currency);
}


async function importTransactions(userId, transactions, currency = 'INR') {
  const toInsert = transactions.filter((t) => !t.is_duplicate);
  if (toInsert.length === 0) return { imported: 0, skipped: transactions.length };

  const rows = toInsert.map((t) => ({
    user_id: userId,
    category_id: t.category_id || null,
    type: t.type,
    amount: toSmallestUnit(t.amount, currency),
    currency,
    amount_in_base: toSmallestUnit(t.amount, currency),
    exchange_rate: 1,
    description: t.description,
    transaction_date: t.date,
    source_hash: t.source_hash,
    is_recurring: false,
    tags: [],
  }));

  await db('transactions').insert(rows);
  logger.info('Bank import completed', { userId, imported: rows.length });
  return { imported: rows.length, skipped: transactions.length - rows.length };
}

module.exports = { previewImport, previewPDFImport, importTransactions, parseCSV };
