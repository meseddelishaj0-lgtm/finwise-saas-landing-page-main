// app/config/api.js
const FMP_API_KEY = "bHEVbQmAwcqlcykQWdA3FEXxypn3qFAU";   // ← put your key here

export const FMP_BASE_URL = "https://financialmodelingprep.com/api/v3";

export const fmp = {
  search: (query) => `${FMP_BASE_URL}/search?query=${query}&limit=10&apikey=${FMP_API_KEY}`,
  quote: (symbol) => `${FMP_BASE_URL}/quote/${symbol}?apikey=${FMP_API_KEY}`,
  trending: () => `${FMP_BASE_URL}/stock_market/gainers?apikey=${FMP_API_KEY}`,
  profile: (symbol) => `${FMP_BASE_URL}/profile/${symbol}?apikey=${FMP_API_KEY}`,
};

