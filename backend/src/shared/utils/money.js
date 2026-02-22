'use strict';



const { ZERO_DECIMAL_CURRENCIES } = require('../../config/constants');


function toSmallestUnit(amount, currency = 'INR') {
  if (ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase())) {
    return Math.round(amount);
  }
  return Math.round(parseFloat(amount) * 100);
}


function fromSmallestUnit(amount, currency = 'INR') {
  if (ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase())) {
    return parseInt(amount, 10);
  }
  return parseInt(amount, 10) / 100;
}



function convertCurrency(amountInSmallestUnit, fromCurrency, toCurrency, rate) {
  if (fromCurrency === toCurrency) return amountInSmallestUnit;
  const decimal = fromSmallestUnit(amountInSmallestUnit, fromCurrency);
  const converted = decimal * rate;
  return toSmallestUnit(converted, toCurrency);
}

module.exports = {
  toSmallestUnit,
  fromSmallestUnit,
  convertCurrency,
};
