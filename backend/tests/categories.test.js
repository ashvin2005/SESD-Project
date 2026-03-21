'use strict';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_32_chars_minimum!!';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_32_chars_min!';

const request = require('supertest');
const app = require('../src/app');
const { setupTestDb, teardownTestDb, truncateAll } = require('./helpers/testDb');
const { createUser, createToken, createCategory, createTransaction } = require('./helpers/factories');

let db;

beforeAll(async () => {
  db = await setupTestDb();
});

beforeEach(async () => {
  await truncateAll(db);
});

afterAll(async () => {
  await teardownTestDb();
});

describe('Categories — CRUD', () => {
  it('creates a category and returns it', async () => {
    const user = await createUser(db);
    const token = createToken(user.id);

    const res = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Groceries', type: 'expense', icon: '🛒', color: '#f97316' });

    expect(res.status).toBe(201);
    expect(res.body.data.category.name).toBe('Groceries');
    expect(res.body.data.category.is_active).toBe(true);
  });

  it('rejects duplicate category name + type for same user', async () => {
    const user = await createUser(db);
    const token = createToken(user.id);
    await createCategory(db, user.id, { name: 'Food', type: 'expense' });

    const res = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Food', type: 'expense' });

    expect(res.status).toBe(409);
  });

  it('lists only active categories', async () => {
    const user = await createUser(db);
    const token = createToken(user.id);
    await createCategory(db, user.id, { name: 'Active Cat', type: 'expense', is_active: true });
    await createCategory(db, user.id, { name: 'Deleted Cat', type: 'expense', is_active: false });

    const res = await request(app)
      .get('/api/v1/categories')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const names = res.body.data.categories.map((c) => c.name);
    expect(names).toContain('Active Cat');
    expect(names).not.toContain('Deleted Cat');
  });
});

describe('Category soft delete — referential integrity', () => {
  it('soft-deletes a category and keeps linked transactions intact', async () => {
    const user = await createUser(db);
    const token = createToken(user.id);

    const category = await createCategory(db, user.id, {
      name: 'Entertainment',
      type: 'expense',
      is_default: false,
    });

    const tx1 = await createTransaction(db, user.id, category.id, {
      description: 'Netflix',
      amount: 64900,
    });
    const tx2 = await createTransaction(db, user.id, category.id, {
      description: 'Spotify',
      amount: 11900,
    });

    const deleteRes = await request(app)
      .delete(`/api/v1/categories/${category.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleteRes.status).toBe(204);

    const dbCategory = await db('categories').where({ id: category.id }).first();
    expect(dbCategory.is_active).toBe(false);

    const dbTx1 = await db('transactions').where({ id: tx1.id }).first();
    const dbTx2 = await db('transactions').where({ id: tx2.id }).first();

    expect(dbTx1).not.toBeNull();
    expect(dbTx1.category_id).toBe(category.id);
    expect(dbTx1.description).toBe('Netflix');

    expect(dbTx2).not.toBeNull();
    expect(dbTx2.category_id).toBe(category.id);
    expect(dbTx2.description).toBe('Spotify');
  });

  it('prevents deleting a default category', async () => {
    const user = await createUser(db);
    const token = createToken(user.id);

    const category = await createCategory(db, user.id, {
      name: 'Salary',
      type: 'income',
      is_default: true,
    });

    const res = await request(app)
      .delete(`/api/v1/categories/${category.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/default/i);

    const dbCategory = await db('categories').where({ id: category.id }).first();
    expect(dbCategory.is_active).toBe(true);
  });

  it('returns 404 when trying to delete another user\'s category', async () => {
    const owner = await createUser(db);
    const other = await createUser(db);
    const otherToken = createToken(other.id);

    const category = await createCategory(db, owner.id, { name: 'Private', type: 'expense' });

    const res = await request(app)
      .delete(`/api/v1/categories/${category.id}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(404);

    const dbCategory = await db('categories').where({ id: category.id }).first();
    expect(dbCategory.is_active).toBe(true);
  });

  it('cannot create transactions against an inactive category', async () => {
    const user = await createUser(db);
    const token = createToken(user.id);

    const category = await createCategory(db, user.id, { name: 'Old Cat', type: 'expense', is_default: false });
    await db('categories').where({ id: category.id }).update({ is_active: false });

    const res = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'expense',
        amount: 500,
        currency: 'INR',
        description: 'Should fail',
        transaction_date: new Date().toISOString().split('T')[0],
        category_id: category.id,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/inactive/i);
  });
});

describe('Category merge', () => {
  it('reassigns all transactions from source to target, then deactivates source', async () => {
    const user = await createUser(db);
    const token = createToken(user.id);

    const source = await createCategory(db, user.id, { name: 'Dining', type: 'expense' });
    const target = await createCategory(db, user.id, { name: 'Food', type: 'expense' });

    const tx1 = await createTransaction(db, user.id, source.id, { description: 'Zomato' });
    const tx2 = await createTransaction(db, user.id, source.id, { description: 'Swiggy' });

    const res = await request(app)
      .post(`/api/v1/categories/${source.id}/merge`)
      .set('Authorization', `Bearer ${token}`)
      .send({ target_category_id: target.id });

    expect(res.status).toBe(200);

    const dbTx1 = await db('transactions').where({ id: tx1.id }).first();
    const dbTx2 = await db('transactions').where({ id: tx2.id }).first();
    expect(dbTx1.category_id).toBe(target.id);
    expect(dbTx2.category_id).toBe(target.id);

    const dbSource = await db('categories').where({ id: source.id }).first();
    expect(dbSource.is_active).toBe(false);
  });

  it('rejects merge of categories with different types', async () => {
    const user = await createUser(db);
    const token = createToken(user.id);

    const expense = await createCategory(db, user.id, { name: 'Food', type: 'expense' });
    const income = await createCategory(db, user.id, { name: 'Salary', type: 'income' });

    const res = await request(app)
      .post(`/api/v1/categories/${expense.id}/merge`)
      .set('Authorization', `Bearer ${token}`)
      .send({ target_category_id: income.id });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/different types/i);
  });
});
