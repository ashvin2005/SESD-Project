'use strict';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_32_chars_minimum!!';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_32_chars_min!';

const request = require('supertest');
const app = require('../src/app');
const { setupTestDb, teardownTestDb, truncateAll } = require('./helpers/testDb');
const { createUser, createToken, createInvestment } = require('./helpers/factories');
const { withPL, portfolioSummary } = require('../src/modules/investments/investments.service');

let db, user, token;

beforeAll(async () => { db = await setupTestDb(); });

beforeEach(async () => {
  await truncateAll(db);
  user = await createUser(db);
  token = createToken(user.id);
});

afterAll(async () => { await teardownTestDb(); });

// ---------------------------------------------------------------------------
// Unit: P/L calculation logic
// ---------------------------------------------------------------------------

describe('withPL – profit/loss computation', () => {
  it('returns zero P/L when current_price is null (falls back to buy_price)', () => {
    const inv = { quantity: '10', buy_price: '500', current_price: null };
    const result = withPL(inv);
    expect(result.total_invested).toBe(5000);
    expect(result.current_value).toBe(5000);
    expect(result.profit_loss).toBe(0);
    expect(result.profit_loss_pct).toBe(0);
  });

  it('calculates profit correctly when current_price > buy_price', () => {
    const inv = { quantity: '10', buy_price: '500', current_price: '750' };
    const result = withPL(inv);
    expect(result.total_invested).toBe(5000);
    expect(result.current_value).toBe(7500);
    expect(result.profit_loss).toBe(2500);
    expect(result.profit_loss_pct).toBe(50);
  });

  it('calculates loss correctly when current_price < buy_price', () => {
    const inv = { quantity: '5', buy_price: '1000', current_price: '800' };
    const result = withPL(inv);
    expect(result.profit_loss).toBe(-1000);
    expect(result.profit_loss_pct).toBe(-20);
  });

  it('handles fractional quantities (crypto use case)', () => {
    const inv = { quantity: '0.5', buy_price: '2000000', current_price: '2500000' };
    const result = withPL(inv);
    expect(result.total_invested).toBe(1000000);
    expect(result.current_value).toBe(1250000);
    expect(result.profit_loss).toBe(250000);
  });
});

describe('portfolioSummary – aggregate totals', () => {
  it('sums up P/L across multiple investments', () => {
    const enriched = [
      { total_invested: 5000, current_value: 7500, profit_loss: 2500 },
      { total_invested: 10000, current_value: 8000, profit_loss: -2000 },
    ];
    const summary = portfolioSummary(enriched);
    expect(summary.total_invested).toBe(15000);
    expect(summary.current_value).toBe(15500);
    expect(summary.profit_loss).toBe(500);
    expect(summary.profit_loss_pct).toBeCloseTo(3.33, 1);
  });

  it('returns 0 pct when total_invested is 0', () => {
    const summary = portfolioSummary([]);
    expect(summary.total_invested).toBe(0);
    expect(summary.profit_loss_pct).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Integration: CRUD via HTTP
// ---------------------------------------------------------------------------

describe('POST /api/v1/investments', () => {
  it('creates a stock investment and returns P/L fields', async () => {
    const res = await request(app)
      .post('/api/v1/investments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'stock',
        name: 'Reliance Industries',
        symbol: 'RELIANCE',
        quantity: 10,
        buy_price: 2500,
        current_price: 2800,
        currency: 'INR',
        investment_date: '2026-01-10',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.investment.type).toBe('stock');
    expect(res.body.data.investment.symbol).toBe('RELIANCE');
    expect(res.body.data.investment.total_invested).toBe(25000);
    expect(res.body.data.investment.current_value).toBe(28000);
    expect(res.body.data.investment.profit_loss).toBe(3000);
    expect(res.body.data.investment.profit_loss_pct).toBe(12);
  });

  it('creates a mutual fund without symbol', async () => {
    const res = await request(app)
      .post('/api/v1/investments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'mutual_fund',
        name: 'Axis Bluechip Fund',
        quantity: 100,
        buy_price: 45.5,
        investment_date: '2026-02-01',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.investment.symbol).toBeNull();
  });

  it('creates a crypto investment with fractional quantity', async () => {
    const res = await request(app)
      .post('/api/v1/investments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'crypto',
        name: 'Bitcoin',
        symbol: 'BTC',
        quantity: 0.25,
        buy_price: 5000000,
        investment_date: '2026-01-01',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.investment.total_invested).toBe(1250000);
  });

  it('rejects invalid type', async () => {
    const res = await request(app)
      .post('/api/v1/investments')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'nft', name: 'Bored Ape', quantity: 1, buy_price: 100, investment_date: '2026-01-01' });

    expect(res.status).toBe(422);
  });

  it('rejects missing required fields', async () => {
    const res = await request(app)
      .post('/api/v1/investments')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'stock', name: 'Test' });

    expect(res.status).toBe(422);
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app)
      .post('/api/v1/investments')
      .send({ type: 'stock', name: 'Test', quantity: 1, buy_price: 100, investment_date: '2026-01-01' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/investments', () => {
  beforeEach(async () => {
    await createInvestment(db, user.id, { name: 'TCS', type: 'stock', buy_price: 3500, current_price: 3800, quantity: 5 });
    await createInvestment(db, user.id, { name: 'Mirae Asset Fund', type: 'mutual_fund', buy_price: 60, quantity: 200 });
  });

  it('returns all investments with P/L and portfolio summary', async () => {
    const res = await request(app)
      .get('/api/v1/investments')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.investments).toHaveLength(2);
    expect(res.body.data.summary).toHaveProperty('total_invested');
    expect(res.body.data.summary).toHaveProperty('profit_loss');
    expect(res.body.data.summary).toHaveProperty('profit_loss_pct');
  });

  it('does not return another user\'s investments', async () => {
    const other = await createUser(db, { email: 'other@test.com' });
    await createInvestment(db, other.id, { name: 'Secret Stock' });

    const res = await request(app)
      .get('/api/v1/investments')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.data.investments.every((i) => i.user_id === user.id)).toBe(true);
  });
});

describe('GET /api/v1/investments/:id', () => {
  it('returns a single investment with P/L', async () => {
    const inv = await createInvestment(db, user.id, { buy_price: 1000, current_price: 1200, quantity: 10 });

    const res = await request(app)
      .get(`/api/v1/investments/${inv.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.investment.id).toBe(inv.id);
    expect(res.body.data.investment.profit_loss).toBe(2000);
  });

  it('returns 404 for another user\'s investment', async () => {
    const other = await createUser(db, { email: 'other2@test.com' });
    const inv = await createInvestment(db, other.id);

    const res = await request(app)
      .get(`/api/v1/investments/${inv.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

describe('PUT /api/v1/investments/:id', () => {
  it('updates current_price and reflects in P/L', async () => {
    const inv = await createInvestment(db, user.id, { buy_price: 500, quantity: 20 });

    const res = await request(app)
      .put(`/api/v1/investments/${inv.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ current_price: 650 });

    expect(res.status).toBe(200);
    expect(res.body.data.investment.profit_loss).toBe(3000);
    expect(res.body.data.investment.profit_loss_pct).toBe(30);
  });

  it('returns 404 when updating another user\'s investment', async () => {
    const other = await createUser(db, { email: 'other3@test.com' });
    const inv = await createInvestment(db, other.id);

    const res = await request(app)
      .put(`/api/v1/investments/${inv.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ current_price: 999 });

    expect(res.status).toBe(404);
  });

  it('rejects an update body with zero valid fields', async () => {
    const inv = await createInvestment(db, user.id);

    const res = await request(app)
      .put(`/api/v1/investments/${inv.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(422);
  });
});

describe('DELETE /api/v1/investments/:id', () => {
  it('deletes own investment', async () => {
    const inv = await createInvestment(db, user.id);

    const res = await request(app)
      .delete(`/api/v1/investments/${inv.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
    const found = await db('investments').where({ id: inv.id }).first();
    expect(found).toBeUndefined();
  });

  it('returns 404 for another user\'s investment', async () => {
    const other = await createUser(db, { email: 'other4@test.com' });
    const inv = await createInvestment(db, other.id);

    const res = await request(app)
      .delete(`/api/v1/investments/${inv.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    const found = await db('investments').where({ id: inv.id }).first();
    expect(found).toBeTruthy();
  });
});
