# Project Idea

## Project Name
**FinanceAI – Personal Finance Tracker with AI Insights**

## Problem Statement

Managing personal finances is something most people struggle with not because they lack discipline but because the tools available are either too simple or too overwhelming. Most finance apps let you log transactions and that's about it. There's no context, no pattern recognition, no guidance on what to do next.

Specifically, people run into problems like:
- No clear picture of where money is actually going each month
- Budget goals that exist on paper but are never tracked in real time
- Multi-currency spending that's hard to reconcile
- Recurring expenses (subscriptions, rent) that eat into budgets silently
- Investments scattered across apps with no unified P&L view
- Bank statements that sit unprocessed because importing them is tedious

The gap is that there's no single place that combines transaction tracking, budget enforcement, investment tracking, and intelligent feedback — all in one tool that's actually usable.

## Proposed Solution

A full-stack personal finance tracker that goes beyond simple CRUD. The core idea is to let users log their financial life — income, expenses, investments — and then surface meaningful insights from that data using an AI layer backed by the Groq API.

Key decisions that shaped the design:

- Amounts stored as integers (paise/cents) — no floating-point rounding errors anywhere in the system
- Cursor-based pagination on transaction lists — no duplicate rows under concurrent writes
- Bank statement import (CSV + PDF) with SHA-256 deduplication — re-importing the same statement doesn't create double entries
- A `recurring_rules` table with a daily cron job — salary, rent, subscriptions auto-create themselves
- AI features use only aggregated financial summaries, not raw transaction data — no PII reaches the model

## Scope

### In Scope
- User registration, login, Google OAuth, profile and preferences
- Full transaction CRUD with filtering, tags, fuzzy search, and bulk operations
- Custom income/expense categories with soft delete and merge
- Budgets with per-category or overall limits (weekly/monthly/yearly) and alert thresholds
- Monthly/yearly reports with gap-filled series and CSV export
- Receipt uploads attached to transactions (local or S3)
- Recurring transaction rules with a daily cron engine
- Multi-currency transactions with exchange rate snapshots
- Investment portfolio tracking (stocks, mutual funds, crypto) with P&L
- Bank statement import (CSV + PDF) with dedup and AI auto-categorisation
- AI features: chat assistant, smart insights, anomaly detection, budget recommendations, goal planner
- In-app notifications with unread count
- Dashboard with financial health score

### Out of Scope
- Real brokerage integration or live market data
- Payment processing
- Mobile app (web only)
- Multi-user households

## Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express 5
- **Database**: PostgreSQL 14+
- **Query Builder**: Knex.js (migrations + query building)
- **Auth**: JWT with refresh token rotation + Passport.js (Google OAuth)
- **AI**: Groq API — llama-3.3-70b-versatile
- **Validation**: Joi
- **Background Jobs**: node-cron
- **Caching**: node-cache
- **File Uploads**: Multer + Sharp
- **Logging**: Winston

### Frontend
- **Framework**: React 18 + Vite
- **Charts**: Recharts
- **State**: React Context (AuthContext)
- **HTTP**: Axios wrappers

## Architecture

The backend uses a feature-based module structure, not a type-based one. Each feature owns its own routes, controller, service, repository, and validation schema. The layers are:

```
Routes → Controllers → Joi Validation
              ↓
         Service Layer  (business logic, orchestration)
              ↓
       Repository Layer  (Knex query builders)
              ↓
         PostgreSQL
```

Shared utilities (error classes, money helpers, the Groq client, logger) live under `src/shared/` and are imported by any module that needs them.

## Key Design Decisions

**Money as integers** — every amount is stored as BIGINT in the smallest currency unit. Division only happens at API response boundaries. This eliminates an entire class of bugs.

**Soft deletes for categories** — setting `is_active = false` instead of hard deleting means historical transactions keep their foreign key intact and old reports stay accurate. The merge endpoint reassigns all transactions before deactivating the source category.

**SHA-256 deduplication on import** — `source_hash` is computed from date + amount + description and stored with a partial unique index per user. Re-importing the same bank export is safe.

**Exchange rate snapshots** — every transaction stores the `exchange_rate` at creation time in `amount_in_base`. Reports always read this snapshot, not a live rate. Immutable audit trail.

**Financial health score** — a weighted algorithm on the dashboard (savings rate 40%, budget adherence 30%, expense diversity 15%, income consistency 15%) gives users a single 0–100 number with per-dimension detail.

## Target Users

- Anyone who wants to track income and expenses without using a spreadsheet
- People with multi-currency spending (travel, freelance income in foreign currencies)
- Users who want to understand their spending habits rather than just log them
- Investors who want one place to see their portfolio P&L alongside daily expenses
