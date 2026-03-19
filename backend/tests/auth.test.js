'use strict';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_32_chars_minimum!!';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_32_chars_min!';

const request = require('supertest');
const app = require('../src/app');
const { setupTestDb, teardownTestDb, truncateAll } = require('./helpers/testDb');
const { createUser, createToken } = require('./helpers/factories');

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

describe('POST /api/v1/auth/register', () => {
  it('registers a new user with default categories', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Alice', email: 'alice@test.com', password: 'Password1234!', base_currency: 'INR' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.email).toBe('alice@test.com');


    const cats = await db('categories').where({ user_id: res.body.data.user.id });
    expect(cats.length).toBeGreaterThan(10);
  });

  it('returns 409 for duplicate email', async () => {
    await createUser(db, { email: 'dup@test.com' });
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Bob', email: 'dup@test.com', password: 'Password1234!' });

    expect(res.status).toBe(409);
  });

  it('returns 422 for missing required fields', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'nopass@test.com' });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/v1/auth/login', () => {
  it('logs in with valid credentials', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Carol', email: 'carol@test.com', password: 'Password1234!' });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'carol@test.com', password: 'Password1234!' });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
  });

  it('returns 401 for wrong password', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Dave', email: 'dave@test.com', password: 'Password1234!' });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'dave@test.com', password: 'WrongPassword!' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/auth/me', () => {
  it('returns current user profile with valid token', async () => {
    const user = await createUser(db, { email: 'me@test.com' });
    const token = createToken(user.id);

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('me@test.com');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with invalid token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });
});
