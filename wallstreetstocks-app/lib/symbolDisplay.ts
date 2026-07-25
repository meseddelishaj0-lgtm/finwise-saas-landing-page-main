// lib/symbolDisplay.ts
// DISPLAY-ONLY symbol formatting: crypto pairs render as their base asset
// ("BTCUSD" / "BTC/USD" → "BTC"). NEVER use these for API calls, WebSocket
// subscriptions, navigation params, or storage keys — the full pair symbol
// stays the source of truth everywhere in data land.

export function displaySymbol(symbol?: string | null): string {
  if (!symbol) return '';
  const s = String(symbol).toUpperCase().trim();
  if (s.includes('/')) return s.split('/')[0]; // BTC/USD → BTC
  // BTCUSD → BTC (same crypto heuristic the app already uses for quote lookups:
  // 2–6 char base + USD/USDT suffix; plain "USD" or stock tickers untouched)
  if (s.endsWith('USDT') && s.length >= 6 && s.length <= 10) return s.slice(0, -4);
  if (s.endsWith('USD') && s.length >= 5 && s.length <= 9) return s.slice(0, -3);
  return s;
}

// Friendly names for the cryptos the app streams/lists
export const CRYPTO_NAMES: Record<string, string> = {
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  BNB: 'BNB',
  SOL: 'Solana',
  XRP: 'Ripple',
  ADA: 'Cardano',
  DOGE: 'Dogecoin',
  AVAX: 'Avalanche',
  DOT: 'Polkadot',
  MATIC: 'Polygon',
  LINK: 'Chainlink',
  LTC: 'Litecoin',
  TRX: 'TRON',
  SHIB: 'Shiba Inu',
  UNI: 'Uniswap',
  ATOM: 'Cosmos',
  XLM: 'Stellar',
  BCH: 'Bitcoin Cash',
  ETC: 'Ethereum Classic',
  NEAR: 'NEAR Protocol',
};

/**
 * Subtitle for a listing row: proper crypto name when the API echoes the pair
 * back as the "name" (e.g. name === "BTCUSD"), otherwise the given name.
 */
export function displayAssetName(symbol?: string | null, name?: string | null): string {
  const base = displaySymbol(symbol);
  const normalized = (v: string) => v.toUpperCase().replace('/', '').trim();
  if (!name || (symbol && normalized(name) === normalized(String(symbol)))) {
    return CRYPTO_NAMES[base] ?? base;
  }
  return name;
}
