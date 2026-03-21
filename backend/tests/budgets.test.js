'use strict';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_32_chars_minimum!!';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_32_chars_min!';

const request = require('supertest');
const app = require('../src/app');
const { setupTestDb, teardownTestDb, truncateAll } = require('./helpers/testDb');
const { createUser, createToken, createCategory, createBudget, createTransaction } = require('./helpers/factories');

let db, user, token, expenseCategory;

beforeAll(async () => {
  db = await setupTestDb();
});

beforeEach(async () => {
  await truncateAll(db);
  user = await createUser(db);
  token = createToken(user.id);
  expenseCategory = await createCategory(db, user.id, { type: 'expense', name: 'Food' });
});

afterAll(async () => {
  await teardownTestDb();
});

describe('POST /api/v1/budgets', () => {
  it('creates a category budget', async () => {
    const res = await request(app)
      .post('/api/v1/budgets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        category_id: expenseCategory.id,
        amount: 5000,
        currency: 'INR',
        period: 'monthly',
        start_date: '2026-01-01',
        alert_threshold: 80,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.budget.amount).toBe(500000); 
  });

  it('creates an overall budget (no category)', async () => {
    const res = await request(app)
      .post('/api/v1/budgets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: 20000,
        currency: 'INR',
        period: 'monthly',
        start_date: '2026-01-01',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.budget.category_id).toBeNull();
  });

  it('rejects duplicate active budget for same category+period', async () => {
    await createBudget(db, user.id, expenseCategory.id, { period: 'monthly' });

    const res = await request(app)
      .post('/api/v1/budgets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        category_id: expenseCategory.id,
        amount: 3000,
        currency: 'INR',
        period: 'monthly',
        start_date: '2026-01-01',
      });

    expect(res.status).toBe(409);
  });

  it('rejects income category for budget', async () => {
    const incCat = await createCategory(db, user.id, { type: 'income', name: 'Salary' });

    const res = await request(app)
      .post('/api/v1/budgets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        category_id: incCat.id,
        amount: 5000,
        currency: 'INR',
        period: 'monthly',
        start_date: '2026-01-01',
      });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/budgets/summary', () => {
  it('returns budget progress with spent amounts', async () => {
    await createBudget(db, user.id, expenseCategory.id, { amount: 500000, period: 'monthly' });


    const today = new Date().toISOString().split('T')[0];
    await createTransaction(db, user.id, expenseCategory.id, {
      type: 'expense',
      amount: 100000,
      amount_in_base: 100000,
      transaction_date: today,
    });

    const res = await request(app)
      .get('/api/v1/budgets/summary')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.budgets).toHaveLength(1);
    const budget = res.body.data.budgets[0];
    expect(budget.spent).toBeGreaterThan(0);
    expect(budget.percentage).toBeGreaterThan(0);
    expect(budget.remaining).toBeLessThan(budget.limit);
  });
});

describe('DELETE /api/v1/budgets/:id', () => {
  it('deletes own budget', async () => {
    const budget = await createBudget(db, user.id, expenseCategory.id);

    const res = await request(app)
      .delete(`/api/v1/budgets/${budget.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
  });

  it('cannot delete another user\'s budget', async () => {
    const otherUser = await createUser(db, { email: 'other@test.com' });
    const otherCat = await createCategory(db, otherUser.id, { type: 'expense' });
    const otherBudget = await createBudget(db, otherUser.id, otherCat.id);

    const res = await request(app)
      .delete(`/api/v1/budgets/${otherBudget.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
