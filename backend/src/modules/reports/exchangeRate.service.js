'use strict';
const axios = require('axios');
const { db } = require('../../config/database');
const config = require('../../config');
const logger = require('../../shared/utils/logger');

const STATIC_RATES_TO_INR = {
  USD: 83.5, EUR: 90.2, GBP: 105.8, JPY: 0.55, CAD: 61.5,
  AUD: 54.2, CHF: 94.1, CNY: 11.5, SGD: 62.0, AED: 22.7,
  SAR: 22.3, HKD: 10.7, NZD: 49.8, SEK: 7.9, NOK: 7.8,
  DKK: 12.1, MXN: 4.9, BRL: 16.8, ZAR: 4.6, INR: 1,
};

function getStaticRate(fromCurrency, toCurrency) {
  const fromINR = STATIC_RATES_TO_INR[fromCurrency];
  const toINR = STATIC_RATES_TO_INR[toCurrency];
  if (fromINR && toINR) return fromINR / toINR;
  return null;
}

async function getRate(fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return 1;

  const today = new Date().toISOString().split('T')[0];

  const cached = await db('exchange_rates')
    .where({ base_currency: fromCurrency, target_currency: toCurrency })
    .whereRaw(`DATE(fetched_at) = ?`, [today])
    .orderBy('fetched_at', 'desc')
    .first();

  if (cached) {
    return parseFloat(cached.rate);
  }

  try {
    const rate = await fetchFromApi(fromCurrency, toCurrency);
    await storeRate(fromCurrency, toCurrency, rate);
    return rate;
  } catch (err) {
    logger.warn('Exchange rate API unavailable, trying last stored rate', {
      from: fromCurrency,
      to: toCurrency,
      error: err.message,
    });

    const stored = await db('exchange_rates')
      .where({ base_currency: fromCurrency, target_currency: toCurrency })
      .orderBy('fetched_at', 'desc')
      .first();

    if (stored) {
      logger.info('Using stored exchange rate as fallback', {
        from: fromCurrency,
        to: toCurrency,
        rate: stored.rate,
        fetchedAt: stored.fetched_at,
      });
      return parseFloat(stored.rate);
    }

    const staticRate = getStaticRate(fromCurrency, toCurrency);
    if (staticRate) {
      logger.warn('Using static fallback exchange rate — may be outdated', {
        from: fromCurrency,
        to: toCurrency,
        rate: staticRate,
      });
      return staticRate;
    }

    logger.error('No exchange rate available for pair — defaulting to 1:1', {
      from: fromCurrency,
      to: toCurrency,
    });
    return 1;
  }
}

async function fetchFromApi(fromCurrency, toCurrency) {
  if (!config.exchangeRate.apiKey) {
    throw new Error('Exchange rate API key not configured');
  }

  const url = `${config.exchangeRate.baseUrl}/${config.exchangeRate.apiKey}/pair/${fromCurrency}/${toCurrency}`;
  const { data } = await axios.get(url, { timeout: 5000 });

  if (data.result !== 'success') {
    throw new Error(`Exchange rate API error: ${data['error-type']}`);
  }

  return data.conversion_rate;
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
