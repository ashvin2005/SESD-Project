'use strict';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_32_chars_minimum!!';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_32_chars_min!';

const { parsePDFText } = require('../src/modules/import/pdfParser');
const { parseCSV } = require('../src/modules/import/import.service');

// ---------------------------------------------------------------------------
// parsePDFText – unit tests (no real PDF needed, tests pure parsing logic)
// ---------------------------------------------------------------------------

describe('parsePDFText – Pattern A: date description amount DR|CR', () => {
  const text = [
    '01/01/2026  NEFT-ABCXYZ-SALARY ACME LTD  75,000.00 CR  75,250.00',
    '05/01/2026  ATM WDL 009123 LINK ROAD HDFC  2,500.00 DR  72,750.00',
    '10/01/2026  POS SWIGGY ORDER #45678  450.00 DR  72,300.00',
    '15/01/2026  IMPS-98765432-FREELANCE CLIENT  12,000.00 CR  84,300.00',
    'Account Statement Summary: Total Debits: 2950.00  Total Credits: 87000.00',
    'Opening Balance: 250.00',
  ].join('\n');

  let rows;
  beforeAll(() => { rows = parsePDFText(text); });

  it('extracts the correct number of transactions', () => {
    expect(rows).toHaveLength(4);
  });

  it('correctly identifies income (CR) rows', () => {
    const incomes = rows.filter((r) => r.type === 'income');
    expect(incomes).toHaveLength(2);
    expect(incomes[0].amount).toBe(75000);
    expect(incomes[1].amount).toBe(12000);
  });

  it('correctly identifies expense (DR) rows', () => {
    const expenses = rows.filter((r) => r.type === 'expense');
    expect(expenses).toHaveLength(2);
    expect(expenses[0].amount).toBe(2500);
    expect(expenses[1].amount).toBe(450);
  });

  it('normalizes dates to YYYY-MM-DD', () => {
    expect(rows[0].date).toBe('2026-01-01');
    expect(rows[1].date).toBe('2026-01-05');
  });

  it('captures description without the balance column', () => {
    expect(rows[0].description).toContain('NEFT-ABCXYZ-SALARY ACME LTD');
  });
});

describe('parsePDFText – Pattern A: date with Mon name format', () => {
  const text = [
    '15 Jan 2026  HDFC NETBANKING TRANSFER  8,500.00 Cr  84,800.00',
    '20-Feb-2026  INSURANCE PREMIUM LIC  3,200.00 Dr  81,600.00',
  ].join('\n');

  let rows;
  beforeAll(() => { rows = parsePDFText(text); });

  it('parses month-name dates correctly', () => {
    expect(rows[0].date).toBe('2026-01-15');
    expect(rows[1].date).toBe('2026-02-20');
  });

  it('handles mixed case DR/CR markers', () => {
    expect(rows[0].type).toBe('income');
    expect(rows[1].type).toBe('expense');
  });
});

describe('parsePDFText – Pattern B: three-column tabular (withdrawal/deposit/balance)', () => {
  const text = [
    '01/03/2026  EMI PAYMENT HDFC HOME LOAN  25,000.00  0.00  55,000.00',
    '05/03/2026  SALARY CREDIT ACME CORP  0.00  80,000.00  1,35,000.00',
  ].join('\n');

  let rows;
  beforeAll(() => { rows = parsePDFText(text); });

  it('identifies debit-only column rows as expense', () => {
    expect(rows[0].type).toBe('expense');
    expect(rows[0].amount).toBe(25000);
  });

  it('identifies credit-only column rows as income', () => {
    expect(rows[1].type).toBe('income');
    expect(rows[1].amount).toBe(80000);
  });
});

describe('parsePDFText – Pattern C: signed amounts', () => {
  const text = [
    '12/04/2026  Coffee Starbucks  -350.00',
    '12/04/2026  Dividend Payout XYZ Fund  +1,200.00',
  ].join('\n');

  let rows;
  beforeAll(() => { rows = parsePDFText(text); });

  it('treats negative amounts as expense', () => {
    expect(rows[0].type).toBe('expense');
    expect(rows[0].amount).toBe(350);
  });

  it('treats positive amounts as income', () => {
    expect(rows[1].type).toBe('income');
    expect(rows[1].amount).toBe(1200);
  });
});

describe('parsePDFText – edge cases', () => {
  it('skips header / summary lines that contain no parseable transaction', () => {
    const text = [
      'Statement Period: 01/01/2026 to 31/01/2026',
      'Customer Name: John Doe',
      'Account Number: XXXX1234',
      '01/01/2026  Valid Transaction  1,000.00 CR  1,000.00',
    ].join('\n');
    const rows = parsePDFText(text);
    expect(rows).toHaveLength(1);
  });

  it('returns empty array for text with no recognizable transactions', () => {
    const rows = parsePDFText('This is just a header page with no transactions.');
    expect(rows).toHaveLength(0);
  });

  it('handles Indian lakh-comma formatting (1,23,456.78)', () => {
    const text = '01/06/2026  Property Sale Proceeds  1,23,456.78 CR  1,23,456.78';
    const rows = parsePDFText(text);
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe(123456.78);
  });
});

// ---------------------------------------------------------------------------
// parseCSV – regression check to confirm refactoring didn't break CSV
// ---------------------------------------------------------------------------

describe('parseCSV – smoke test after service refactor', () => {
  const csv = [
    'Date,Description,Credit,Debit,Balance',
    '01/01/2026,Salary,50000,,50000',
    '02/01/2026,Groceries,,1200,48800',
  ].join('\n');

  it('still parses CSV rows correctly', () => {
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].type).toBe('income');
    expect(rows[0].amount).toBe(50000);
    expect(rows[1].type).toBe('expense');
    expect(rows[1].amount).toBe(1200);
  });
});
