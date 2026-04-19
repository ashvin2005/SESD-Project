'use strict';
const axios = require('axios');

/**
 * Design Pattern: Strategy
 *
 * ExchangeRateStrategy defines the interface (abstract base).
 * Concrete strategies implement different rate-fetching approaches.
 * ExchangeRateContext selects and chains strategies at runtime.
 *
 *  Strategies (in priority order):
 *   1. CachedRateStrategy   — today's rate already stored in the DB
 *   2. ApiRateStrategy      — fetch live rate from external API
 *   3. StoredRateStrategy   — last known rate from DB (any date)
 *   4. StaticRateStrategy   — hardcoded fallback rates
 */

// ---------------------------------------------------------------------------
// Abstract base strategy
// ---------------------------------------------------------------------------

class ExchangeRateStrategy {
  /**
   * Attempt to resolve the exchange rate.
   * @param {string} from  Source currency code (e.g. 'USD')
   * @param {string} to    Target currency code (e.g. 'INR')
   * @returns {Promise<number|null>}  Rate, or null if unavailable.
   */
  // eslint-disable-next-line no-unused-vars
  async getRate(from, to) {
    throw new Error(`${this.constructor.name}.getRate() is not implemented`);
  }
}

// ---------------------------------------------------------------------------
// Concrete Strategy 1 — DB cache (today's rate)
// ---------------------------------------------------------------------------

class CachedRateStrategy extends ExchangeRateStrategy {
  constructor(db) {
    super();
    this.db = db;
  }

  async getRate(from, to) {
    const today = new Date().toISOString().split('T')[0];
    const cached = await this.db('exchange_rates')
      .where({ base_currency: from, target_currency: to })
      .whereRaw(`DATE(fetched_at) = ?`, [today])
      .orderBy('fetched_at', 'desc')
      .first();
    return cached ? parseFloat(cached.rate) : null;
  }
}

// ---------------------------------------------------------------------------
// Concrete Strategy 2 — Live API
// ---------------------------------------------------------------------------

class ApiRateStrategy extends ExchangeRateStrategy {
  constructor(db, config) {
    super();
    this.db = db;
    this.config = config;
  }

  async getRate(from, to) {
    if (!this.config.exchangeRate.apiKey) return null;

    const url = `${this.config.exchangeRate.baseUrl}/${this.config.exchangeRate.apiKey}/pair/${from}/${to}`;
    const { data } = await axios.get(url, { timeout: 5000 });
    if (data.result !== 'success') return null;

    const rate = data.conversion_rate;
    await this._storeRate(from, to, rate);
    return rate;
  }

  async _storeRate(baseCurrency, targetCurrency, rate) {
    await this.db.raw(
      `INSERT INTO exchange_rates (base_currency, target_currency, rate)
       VALUES (?, ?, ?)
       ON CONFLICT DO NOTHING`,
      [baseCurrency, targetCurrency, rate]
    );
  }
}

// ---------------------------------------------------------------------------
// Concrete Strategy 3 — Last stored rate (any date, DB fallback)
// ---------------------------------------------------------------------------

class StoredRateStrategy extends ExchangeRateStrategy {
  constructor(db) {
    super();
    this.db = db;
  }

  async getRate(from, to) {
    const stored = await this.db('exchange_rates')
      .where({ base_currency: from, target_currency: to })
      .orderBy('fetched_at', 'desc')
      .first();
    return stored ? parseFloat(stored.rate) : null;
  }
}

// ---------------------------------------------------------------------------
// Concrete Strategy 4 — Static hardcoded rates (last-resort fallback)
// ---------------------------------------------------------------------------

const STATIC_RATES_TO_INR = {
  USD: 83.5, EUR: 90.2, GBP: 105.8, JPY: 0.55, CAD: 61.5,
  AUD: 54.2, CHF: 94.1, CNY: 11.5, SGD: 62.0, AED: 22.7,
  SAR: 22.3, HKD: 10.7, NZD: 49.8, SEK: 7.9, NOK: 7.8,
  DKK: 12.1, MXN: 4.9, BRL: 16.8, ZAR: 4.6, INR: 1,
};

class StaticRateStrategy extends ExchangeRateStrategy {
  // eslint-disable-next-line no-unused-vars
  async getRate(from, to) {
    const fromINR = STATIC_RATES_TO_INR[from];
    const toINR = STATIC_RATES_TO_INR[to];
    if (fromINR && toINR) return fromINR / toINR;
    return null;
  }
}

// ---------------------------------------------------------------------------
// Context — chains strategies, returning the first successful result
// ---------------------------------------------------------------------------

class ExchangeRateContext {
  /**
   * @param {ExchangeRateStrategy[]} strategies  Ordered list; first non-null wins.
   */
  constructor(strategies) {
    this.strategies = strategies;
  }

  /**
   * Resolve an exchange rate by trying each strategy in order.
   * @param {string} from
   * @param {string} to
   * @returns {Promise<number>}
   */
  async getRate(from, to) {
    if (from === to) return 1;

    for (const strategy of this.strategies) {
      try {
        const rate = await strategy.getRate(from, to);
        if (rate !== null) return rate;
      } catch {
        // try next strategy
      }
    }

    return 1;
  }
}

module.exports = {
  ExchangeRateStrategy,
  CachedRateStrategy,
  ApiRateStrategy,
  StoredRateStrategy,
  StaticRateStrategy,
  ExchangeRateContext,
};
