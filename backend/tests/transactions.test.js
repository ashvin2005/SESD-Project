'use strict';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_32_chars_minimum!!';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_32_chars_min!';

const request = require('supertest');
const app = require('../src/app');
const { setupTestDb, teardownTestDb, truncateAll } = require('./helpers/testDb');
const { createUser, createToken, createCategory, createTransaction } = require('./helpers/factories');

let db, user, token, expenseCategory, incomeCategory;

beforeAll(async () => {
  db = await setupTestDb();
});

beforeEach(async () => {
  await truncateAll(db);
  user = await createUser(db);
  token = createToken(user.id);
  expenseCategory = await createCategory(db, user.id, { type: 'expense' });
  incomeCategory = await createCategory(db, user.id, { type: 'income' });
});

afterAll(async () => {
  await teardownTestDb();
});

describe('POST /api/v1/transactions', () => {
  it('creates an expense transaction', async () => {
    const res = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'expense',
        amount: 500,
        currency: 'INR',
        description: 'Coffee',
        transaction_date: '2026-01-15',
        category_id: expenseCategory.id,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.transaction.amount).toBe(50000); // stored as paise
    expect(res.body.data.transaction.user_id).toBe(user.id);
  });

  it('creates an income transaction', async () => {
    const res = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'income',
        amount: 50000,
        currency: 'INR',
        description: 'Monthly Salary',
        transaction_date: '2026-01-01',
        category_id: incomeCategory.id,
      });

    expect(res.status).toBe(201);
  });

  it('rejects category type mismatch', async () => {
    const res = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'expense',
        amount: 100,
        currency: 'INR',
        description: 'Wrong category type',
        transaction_date: '2026-01-15',
        category_id: incomeCategory.id,
      });

    expect(res.status).toBe(400);
  });

  it('prevents accessing another user\'s categories', async () => {
    const otherUser = await createUser(db, { email: 'other@test.com' });
    const otherCategory = await createCategory(db, otherUser.id, { type: 'expense' });

    const res = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'expense',
        amount: 100,
        currency: 'INR',
        description: 'Other user category',
        transaction_date: '2026-01-15',
        category_id: otherCategory.id,
      });

    expect(res.status).toBe(404);
  });
});

describe('GET /api/v1/transactions', () => {
  beforeEach(async () => {

    for (let i = 0; i < 5; i++) {
      await createTransaction(db, user.id, expenseCategory.id, {
        description: `Transaction ${i}`,
        transaction_date: `2026-01-${String(i + 1).padStart(2, '0')}`,
      });
    }
  });

  it('lists transactions with pagination', async () => {
    const res = await request(app)
      .get('/api/v1/transactions?limit=3')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.meta.total).toBe(5);
    expect(res.body.meta.next_cursor).toBeTruthy();
  });

  it('filters by type', async () => {
    await createTransaction(db, user.id, incomeCategory.id, { type: 'income', amount: 10000 });

    const res = await request(app)
      .get('/api/v1/transactions?type=income')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.every((t) => t.type === 'income')).toBe(true);
  });

  it('does not return another user\'s transactions', async () => {
    const otherUser = await createUser(db, { email: 'other2@test.com' });
    const otherCat = await createCategory(db, otherUser.id);
    await createTransaction(db, otherUser.id, otherCat.id, { description: 'Other user tx' });

    const res = await request(app)
      .get('/api/v1/transactions')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.data.every((t) => !t.description.includes('Other user'))).toBe(true);
  });
});

describe('DELETE /api/v1/transactions/:id', () => {
  it('deletes own transaction', async () => {
    const tx = await createTransaction(db, user.id, expenseCategory.id);

    const res = await request(app)
      .delete(`/api/v1/transactions/${tx.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
    const found = await db('transactions').where({ id: tx.id }).first();
    expect(found).toBeUndefined();
  });

  it('returns 404 for another user\'s transaction', async () => {
    const otherUser = await createUser(db, { email: 'other3@test.com' });
    const otherCat = await createCategory(db, otherUser.id);
    const otherTx = await createTransaction(db, otherUser.id, otherCat.id);

    const res = await request(app)
      .delete(`/api/v1/transactions/${otherTx.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);

    const found = await db('transactions').where({ id: otherTx.id }).first();
    expect(found).toBeTruthy();
  });
});
