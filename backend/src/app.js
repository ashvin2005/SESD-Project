'use strict';
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const passport = require('passport');
const config = require('./config');
const { standardLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./shared/utils/logger');


const authRoutes = require('./modules/auth/auth.routes');
const transactionRoutes = require('./modules/transactions/transactions.routes');
const categoryRoutes = require('./modules/categories/categories.routes');
const budgetRoutes = require('./modules/budgets/budgets.routes');
const notificationRoutes = require('./modules/notifications/notifications.routes');
const receiptRoutes = require('./modules/receipts/receipts.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');
const reportsRoutes = require('./modules/reports/reports.routes');
const insightsRoutes = require('./modules/insights/insights.routes');
const recurringRoutes = require('./modules/recurring/recurring.routes');
const chatRoutes = require('./modules/chat/chat.routes');
const importRoutes = require('./modules/import/import.routes');
const aiRoutes = require('./modules/ai/ai.routes');
const investmentRoutes = require('./modules/investments/investments.routes');

const app = express();


app.set('trust proxy', 1);
app.use(helmet());


function toOrigin(url) {
  try { return new URL(url).origin; } catch { return null; }
}

function parseCsvOrigins(value) {
  if (!value || typeof value !== 'string') return [];
  return value
    .split(',')
    .map((item) => toOrigin(item.trim()) || item.trim())
    .filter(Boolean);
}

function parseRegexList(value) {
  if (!value || typeof value !== 'string') return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((pattern) => {
      try {
        return new RegExp(pattern);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5001',
  toOrigin(config.frontendUrl),
  ...parseCsvOrigins(process.env.CORS_ALLOWED_ORIGINS),
].filter(Boolean);

const ALLOWED_ORIGIN_REGEX = [
  /^https:\/\/sesd-project.*\.vercel\.app$/,
  ...parseRegexList(process.env.CORS_ALLOWED_ORIGIN_REGEX),
];

function isOriginAllowed(origin) {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  return ALLOWED_ORIGIN_REGEX.some((regex) => regex.test(origin));
}

app.use(
  cors({
    origin: (origin, cb) => {
      if (isOriginAllowed(origin)) return cb(null, true);
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.options('/{*path}', cors());


app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));


app.use(passport.initialize());


app.use('/api/', standardLimiter);


app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    env: config.env,
  });
});


const API = '/api/v1';
app.use(`${API}/auth`, authRoutes);
app.use(`${API}/transactions`, transactionRoutes);
app.use(`${API}/categories`, categoryRoutes);
app.use(`${API}/budgets`, budgetRoutes);
app.use(`${API}/notifications`, notificationRoutes);
app.use(`${API}/receipts`, receiptRoutes);
app.use(`${API}/dashboard`, dashboardRoutes);
app.use(`${API}/reports`, reportsRoutes);
app.use(`${API}/insights`, insightsRoutes);
app.use(`${API}/recurring`, recurringRoutes);
app.use(`${API}/chat`, chatRoutes);
app.use(`${API}/import`, importRoutes);
app.use(`${API}/ai`, aiRoutes);
app.use(`${API}/investments`, investmentRoutes);


app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
  });
});


app.use(errorHandler);

module.exports = app;