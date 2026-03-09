'use strict';
const pdfParse = require('pdf-parse');
const logger = require('../../shared/utils/logger');
const { BadRequestError } = require('../../shared/errors');

const MONTH_MAP = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

function normalizeDate(raw) {
  const s = raw.trim();

  // DD/MM/YYYY or DD-MM-YYYY
  let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;

  // DD Mon YYYY or DD-Mon-YYYY (e.g. 15 Jan 2026, 15-Jan-2026)
  m = s.match(/^(\d{1,2})[\s\-](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\-](\d{4})$/i);
  if (m) {
    const mon = MONTH_MAP[m[2].toLowerCase().slice(0, 3)];
    return `${m[3]}-${mon}-${m[1].padStart(2, '0')}`;
  }

  // YYYY-MM-DD (ISO)
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return s;

  return null;
}

function parseAmount(raw) {
  // Strip currency symbols, spaces, and Indian-style commas (1,23,456.78)
  const cleaned = raw.replace(/[₹$€£\s]/g, '').replace(/,/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) || num < 0 ? 0 : num;
}

// DATE pattern shared fragment – matches common date formats as a capture group
const DATE_FRAG = '(\\d{1,2}[\\/-]\\d{1,2}[\\/-]\\d{4}|\\d{1,2}[\\s-](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\\s-]\\d{4}|\\d{4}-\\d{2}-\\d{2})';

// Amount fragment: digits with optional Indian-style commas, optional decimal
const AMT_FRAG = '([\\d,]+\\.?\\d{0,2})';

const LINE_PARSERS = [
  // Pattern A: DATE  DESCRIPTION  AMOUNT  DR|CR  [BALANCE]
  // e.g. "15/01/2026  NEFT-SALARY ABC LTD  75,000.00 CR  75,250.00"
  {
    re: new RegExp(`^${DATE_FRAG}\\s+(.+?)\\s+${AMT_FRAG}\\s+(DR|CR|Debit|Credit|DEBIT|CREDIT)(?:\\s.*)?$`, 'i'),
    extract(m) {
      const amount = parseAmount(m[3]);
      const type = /^(cr|credit)$/i.test(m[4]) ? 'income' : 'expense';
      return { rawDate: m[1], description: m[2].trim(), amount, type };
    },
  },
  // Pattern B: DATE  DESCRIPTION  WITHDRAWAL  DEPOSIT  BALANCE
  // e.g. "15/01/2026  ATM Withdrawal  2,500.00    75,250.00"
  // Debit column populated → expense; credit column populated → income
  {
    re: new RegExp(`^${DATE_FRAG}\\s+(.+?)\\s+${AMT_FRAG}\\s+${AMT_FRAG}\\s+${AMT_FRAG}\\s*$`),
    extract(m) {
      const col1 = parseAmount(m[3]); // withdrawal / debit
      const col2 = parseAmount(m[4]); // deposit / credit
      if (col1 > 0 && col2 === 0) return { rawDate: m[1], description: m[2].trim(), amount: col1, type: 'expense' };
      if (col2 > 0 && col1 === 0) return { rawDate: m[1], description: m[2].trim(), amount: col2, type: 'income' };
      return null;
    },
  },
  // Pattern C: DATE  DESCRIPTION  AMOUNT (sign determines type)
  // e.g. "15/01/2026  NEFT Credit  +75,000.00" or "15/01/2026  Grocery  -450.00"
  {
    re: new RegExp(`^${DATE_FRAG}\\s+(.+?)\\s+([+-]?[\\d,]+\\.?\\d{0,2})\\s*$`),
    extract(m) {
      const raw = m[3].trim();
      const negative = raw.startsWith('-');
      const amount = parseAmount(raw.replace(/^[+-]/, ''));
      if (amount === 0) return null;
      return { rawDate: m[1], description: m[2].trim(), amount, type: negative ? 'expense' : 'income' };
    },
  },
];

/**
 * Parse raw text extracted from a bank statement PDF into transaction rows.
 * Exported for direct unit testing (no pdf-parse dependency needed in tests).
 *
 * @param {string} text
 * @returns {{ date: string, description: string, amount: number, type: 'income'|'expense' }[]}
 */
function parsePDFText(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\t/g, ' ').replace(/ {2,}/g, ' ').trim())
    .filter((l) => l.length > 10);

  const rows = [];
  let skipped = 0;

  for (const line of lines) {
    let matched = false;
    for (const parser of LINE_PARSERS) {
      const m = line.match(parser.re);
      if (!m) continue;

      const extracted = parser.extract(m);
      if (!extracted || extracted.amount <= 0) break;

      const date = normalizeDate(extracted.rawDate);
      if (!date) { skipped++; break; }

      rows.push({ date, description: extracted.description, amount: extracted.amount, type: extracted.type });
      matched = true;
      break;
    }
    if (!matched && /^\d{1,2}[\/\-]/.test(line)) {
      // Line starts with what looks like a date but didn't match any pattern
      skipped++;
    }
  }

  if (skipped > 0) {
    logger.warn('PDF parser: lines with unrecognized format skipped', { count: skipped });
  }

  return rows;
}

/**
 * Extract and parse transactions from a PDF buffer.
 *
 * @param {Buffer} buffer
 * @returns {Promise<{ date: string, description: string, amount: number, type: 'income'|'expense' }[]>}
 */
async function parsePDF(buffer) {
  let data;
  try {
    data = await pdfParse(buffer);
  } catch (err) {
    logger.error('PDF extraction failed', { error: err.message });
    throw new BadRequestError(
      'Could not read PDF file. Ensure it is a valid, non-encrypted PDF bank statement.'
    );
  }

  const text = data.text || '';
  if (text.trim().length === 0) {
    throw new BadRequestError(
      'PDF appears to be empty or image-based (scanned). Only text-based PDFs are supported.'
    );
  }

  const rows = parsePDFText(text);
  logger.info('PDF parsed successfully', { pages: data.numpages, transactions: rows.length });

  if (rows.length === 0) {
    throw new BadRequestError(
      'No transactions could be extracted from this PDF. ' +
      'The format may not be supported — try exporting a CSV from your bank instead.'
    );
  }

  return rows;
}

module.exports = { parsePDF, parsePDFText };
