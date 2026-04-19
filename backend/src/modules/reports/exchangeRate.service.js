'use strict';
const axios = require('axios');
const { db } = require('../../config/database');
const config = require('../../config');
const logger = require('../../shared/utils/logger');
const {
  CachedRateStrategy,
  ApiRateStrategy,
  StoredRateStrategy,
  StaticRateStrategy,
  ExchangeRateContext,
} = require('./strategies/ExchangeRateStrategy');

/**
 * Strategy Pattern — build a context with ordered fallback strategies:
 *   1. Today's DB cache  →  2. Live API  →  3. Any stored rate  →  4. Static table
 */
const rateContext = new ExchangeRateContext([
  new CachedRateStrategy(db),
  new ApiRateStrategy(db, config),
  new StoredRateStrategy(db),
  new StaticRateStrategy(),
]);

async function getRate(fromCurrency, toCurrency) {
  const rate = await rateContext.getRate(fromCurrency, toCurrency);
  if (rate === 1 && fromCurrency !== toCurrency) {
    logger.warn('No exchange rate available for pair — defaulting to 1:1', {
      from: fromCurrency, to: toCurrency,
    });
  }
  return rate;
}

async function storeRate(baseCurrency, targetCurrency, rate) {
  await db.raw(
    `INSERT INTO exchange_rates (base_currency, target_currency, rate)
     VALUES (?, ?, ?)
     ON CONFLICT DO NOTHING`,
    [baseCurrency, targetCurrency, rate]
  );
}


async function syncAllRates(baseCurrency) {
  if (!config.exchangeRate.apiKey) {
    logger.warn('Exchange rate API key not configured; skipping sync');
    return;
  }

  try {
    const url = `${config.exchangeRate.baseUrl}/${config.exchangeRate.apiKey}/latest/${baseCurrency}`;
    const { data } = await axios.get(url, { timeout: 10000 });

    if (data.result !== 'success') {
      throw new Error(`Exchange rate API error: ${data['error-type']}`);
    }

    const rates = data.conversion_rates;
    const rows = Object.entries(rates).map(([target, rate]) => ({
      base_currency: baseCurrency,
      target_currency: target,
      rate,
    }));


    const chunks = [];
    for (let i = 0; i < rows.length; i += 50) {
      chunks.push(rows.slice(i, i + 50));
    }
    for (const chunk of chunks) {
      const values = chunk.map(() => '(?, ?, ?)').join(', ');
      const bindings = chunk.flatMap((r) => [r.base_currency, r.target_currency, r.rate]);
      await db.raw(
        `INSERT INTO exchange_rates (base_currency, target_currency, rate) VALUES ${values} ON CONFLICT DO NOTHING`,
        bindings
      );
    }

    logger.info('Exchange rates synced', { base: baseCurrency, count: rows.length });
  } catch (err) {
    logger.error('Failed to sync exchange rates', { base: baseCurrency, error: err.message });
    throw err;
  }
}

module.exports = { getRate, syncAllRates, storeRate };
