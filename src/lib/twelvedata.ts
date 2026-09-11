// src/lib/twelvedata.ts
//
// Single Twelve Data client for the whole website. Every market-data route
// goes through here so there is one place that owns the API key, the credit
// budget, symbol translation and response normalisation.
//
// Why normalisation matters: the site was built against Financial Modeling
// Prep's response shapes (`price`, `changesPercentage`, `marketCap`, …). The
// helpers below emit those same field names from Twelve Data payloads, so the
// consuming pages and components did not have to be rewritten field-by-field.
//
// Plan note: this account is on Twelve Data **Pro** (987 credits/minute, on
// the same key the mobile app uses). Measured costs and availability are in
// TWELVEDATA_MIGRATION.md. In short:
//   - Prices are cheap: quote, price, time_series and indicators cost 1
//     credit a symbol. Fundamentals are not: statistics 50, each financial
//     statement 100, insider_transactions 200.
//   - Ultra/Enterprise only: analyst estimates, price targets,
//     recommendations, analyst ratings, key executives, institutional holders
//     and EDGAR filings. Those, and valuation fields for symbol lists, come
//     from FMP via @/lib/fmp.
//   - NOT available: US index symbols (SPX/IXIC/DJI are rejected) and the
//     /etfs/world + /mutual_funds/world deep-data families.
//   - Does not exist on any plan: a general news feed.
//   - AAPL is a demo symbol: every endpoint answers for it at 1 credit, so
//     never judge availability or cost with it.
//
// Indices are therefore served through liquid ETF proxies (see INDEX_PROXY).
// The caret symbol and the human name are preserved in the response so callers
// that key on "^GSPC" keep working; only the price level is the ETF's.

import { fmp } from "./fmp";

export const TD_BASE = "https://api.twelvedata.com";

export class TwelveDataError extends Error {
  constructor(message: string, readonly code?: number) {
    super(message);
    this.name = "TwelveDataError";
  }
}

function apiKey(): string {
  const k = process.env.TWELVE_DATA_API_KEY;
  if (!k) throw new TwelveDataError("TWELVE_DATA_API_KEY is not set");
  return k;
}

/* ------------------------------------------------------------------ *
 * Credit budget
 *
 * Pro allows 987 credits/minute, shared with the mobile app. A batch quote
 * costs one credit per symbol and fundamentals far more (statistics 50,
 * statements 100), so any wide fan-out can exhaust the window and start
 * returning 429s. This token bucket keeps the process under budget by
 * making callers wait rather than fail. It is per-instance, which matches
 * how the caches here already work — and every `cost` passed to td() must
 * match the real weight for it to help.
 * ------------------------------------------------------------------ */

const CREDITS_PER_MIN = Number(process.env.TWELVE_DATA_CREDITS_PER_MIN || 900);
const WINDOW_MS = 60_000;

let credits = CREDITS_PER_MIN;
let refilledAt = Date.now();

function refill() {
  const now = Date.now();
  const gained = ((now - refilledAt) / WINDOW_MS) * CREDITS_PER_MIN;
  if (gained > 0) {
    credits = Math.min(CREDITS_PER_MIN, credits + gained);
    refilledAt = now;
  }
}

async function spend(cost: number): Promise<void> {
  // A single request can never cost more than the whole window.
  const need = Math.min(cost, CREDITS_PER_MIN);
  for (;;) {
    refill();
    if (credits >= need) {
      credits -= need;
      return;
    }
    const deficit = need - credits;
    const waitMs = Math.ceil((deficit / CREDITS_PER_MIN) * WINDOW_MS) + 25;
    await new Promise((r) => setTimeout(r, Math.min(waitMs, WINDOW_MS)));
  }
}

/* ------------------------------------------------------------------ *
 * Response cache
 * ------------------------------------------------------------------ */

interface Entry {
  at: number;
  ttl: number;
  data: unknown;
}
const cache = new Map<string, Entry>();

function cacheGet(key: string): unknown | undefined {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.at > hit.ttl) return undefined;
  return hit.data;
}

function cacheSet(key: string, data: unknown, ttl: number) {
  if (cache.size > 600) {
    const oldest = [...cache.entries()]
      .sort((a, b) => a[1].at - b[1].at)
      .slice(0, 200);
    for (const [k] of oldest) cache.delete(k);
  }
  cache.set(key, { at: Date.now(), ttl, data });
}

/** Last-known-good store, used to ride out upstream failures. */
const stale = new Map<string, unknown>();

/* ------------------------------------------------------------------ *
 * Core fetch
 * ------------------------------------------------------------------ */

export interface TdOptions {
  /** Cache lifetime in ms. 0 disables caching. */
  ttl?: number;
  /** Credit cost of the call; defaults to 1. */
  cost?: number;
  /** Serve the previous successful payload if the call fails. */
  allowStale?: boolean;
  signal?: AbortSignal;
}

/**
 * Call a Twelve Data endpoint. Throws TwelveDataError on an API-level error
 * so callers can distinguish "no data" from "request failed".
 */
export async function td<T = unknown>(
  path: string,
  params: Record<string, string | number | undefined | null> = {},
  opts: TdOptions = {}
): Promise<T> {
  const { ttl = 60_000, cost = 1, allowStale = true } = opts;

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  }
  const cacheKey = `${path}?${qs.toString()}`;
  if (ttl > 0) {
    const hit = cacheGet(cacheKey);
    if (hit !== undefined) return hit as T;
  }

  qs.set("apikey", apiKey());
  const url = `${TD_BASE}/${path.replace(/^\/+/, "")}?${qs.toString()}`;

  // The minute budget is shared across every process using this key, so the
  // local token bucket can believe it has credits when the account does not.
  // Twelve Data signals that either as HTTP 429 or as a 200 whose body is
  // {"code":429,...}; both are retryable, and only after the window rolls.
  const MAX_ATTEMPTS = 3;
  let lastErr: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      await spend(cost);
      const res = await fetch(url, { cache: "no-store", signal: opts.signal });

      if (!res.ok) {
        if (res.status === 429 && attempt < MAX_ATTEMPTS - 1) {
          await backoff(attempt);
          continue;
        }
        throw new TwelveDataError(`Twelve Data HTTP ${res.status}`, res.status);
      }

      const json = (await res.json()) as T;
      const err = apiError(json);
      if (err) {
        if (err.code === 429 && attempt < MAX_ATTEMPTS - 1) {
          // Drain the local bucket too, so parallel callers in this process
          // stop piling on while the account is over budget.
          credits = 0;
          refilledAt = Date.now();
          await backoff(attempt);
          continue;
        }
        throw err;
      }

      if (ttl > 0) cacheSet(cacheKey, json, ttl);
      stale.set(cacheKey, json);
      return json;
    } catch (e) {
      lastErr = e;
      // A non-rate-limit failure is not worth retrying.
      if (e instanceof TwelveDataError && e.code !== 429) break;
      if (attempt >= MAX_ATTEMPTS - 1) break;
      await backoff(attempt);
    }
  }

  if (allowStale && stale.has(cacheKey)) return stale.get(cacheKey) as T;
  throw lastErr instanceof TwelveDataError
    ? lastErr
    : new TwelveDataError(lastErr instanceof Error ? lastErr.message : "request failed");
}

function backoff(attempt: number): Promise<void> {
  const ms = 1_500 * Math.pow(2, attempt) + Math.random() * 500;
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Returns a TwelveDataError when the payload is an API-level error.
 * Twelve Data marks these with `status: "error"` on an otherwise 200 response;
 * successful payloads never carry that field.
 */
function apiError(json: unknown): TwelveDataError | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const o = json as Record<string, unknown>;
  if (o.status !== "error") return null;
  return new TwelveDataError(
    String(o.message || "Twelve Data error"),
    typeof o.code === "number" ? o.code : undefined
  );
}

/** td() that resolves to null instead of throwing. */
export async function tdSafe<T = unknown>(
  path: string,
  params: Record<string, string | number | undefined | null> = {},
  opts: TdOptions = {}
): Promise<T | null> {
  try {
    return await td<T>(path, params, opts);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * Symbol translation
 * ------------------------------------------------------------------ */

/**
 * US index symbols, which the Pro plan does not sell. Quotes, prices and
 * history for these come from FMP at their real levels (see "US indices,
 * served from FMP" below). `proxy` is the ETF that tracks each one, used only
 * by Twelve Data-only calls that go through toTdSymbol (statistics,
 * indicators).
 */
export const INDEX_PROXY: Record<string, { proxy: string; name: string }> = {
  "^GSPC": { proxy: "SPY", name: "S&P 500" },
  "^SPX": { proxy: "SPY", name: "S&P 500" },
  "^IXIC": { proxy: "QQQ", name: "Nasdaq Composite" },
  "^NDX": { proxy: "QQQ", name: "Nasdaq 100" },
  "^DJI": { proxy: "DIA", name: "Dow Jones Industrial Average" },
  "^RUT": { proxy: "IWM", name: "Russell 2000" },
  "^VIX": { proxy: "VIXY", name: "CBOE Volatility Index" },
  "^TNX": { proxy: "IEF", name: "US 10 Year Treasury Yield" },
  "^TYX": { proxy: "TLT", name: "US 30 Year Treasury Yield" },
  "^FVX": { proxy: "IEI", name: "US 5 Year Treasury Yield" },
};

/** Commodity tickers the site uses, mapped to Twelve Data equivalents. */
const COMMODITY_MAP: Record<string, string> = {
  GCUSD: "XAU/USD",
  XAUUSD: "XAU/USD",
  SIUSD: "XAG/USD",
  XAGUSD: "XAG/USD",
  PLUSD: "XPT/USD",
  PAUSD: "XPD/USD",
  CLUSD: "CL1",
  BZUSD: "BRN1",
  NGUSD: "NG1",
  HGUSD: "HG1",
  ZCUSD: "C_1",
  ZWUSD: "W_1",
  ZSUSD: "S_1",
  KCUSD: "KC1",
  CCUSD: "CC1",
  SBUSD: "SB1",
};

const FX_CODES = new Set([
  "USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "NZD", "MXN", "CNY",
  "HKD", "SGD", "SEK", "NOK", "DKK", "PLN", "TRY", "ZAR", "INR", "BRL",
  "KRW", "TWD", "THB", "ILS", "CZK", "HUF",
]);

/** Known crypto bases so `XXXUSD` is not mistaken for an equity ticker. */
const CRYPTO_BASES = new Set([
  "BTC", "ETH", "SOL", "XRP", "DOGE", "ADA", "AVAX", "DOT", "LINK", "MATIC",
  "LTC", "BCH", "UNI", "ATOM", "XLM", "ETC", "FIL", "APT", "ARB", "OP",
  "NEAR", "ICP", "SHIB", "TRX", "TON", "SUI", "PEPE", "INJ", "RNDR", "HBAR",
  "USDT", "USDC", "BNB", "CRO", "ALGO", "VET", "AAVE", "MKR", "SAND", "MANA",
]);

export type AssetClass = "stock" | "etf" | "index" | "crypto" | "forex" | "commodity";

/** Classify a site-level symbol without calling the API. */
export function classify(symbol: string): AssetClass {
  const s = symbol.toUpperCase();
  if (s.startsWith("^")) return "index";
  if (COMMODITY_MAP[s]) return "commodity";
  if (s.includes("/")) {
    const [a, b] = s.split("/");
    if (CRYPTO_BASES.has(a)) return "crypto";
    if (FX_CODES.has(a) && FX_CODES.has(b)) return "forex";
  }
  if (s.length >= 5 && s.endsWith("USD")) {
    const base = s.slice(0, -3);
    if (CRYPTO_BASES.has(base)) return "crypto";
  }
  if (s.length === 6) {
    const a = s.slice(0, 3);
    const b = s.slice(3);
    if (FX_CODES.has(a) && FX_CODES.has(b)) return "forex";
  }
  return "stock";
}

/**
 * Translate a site symbol into the symbol Twelve Data expects.
 *   ^GSPC  -> SPY        (index proxy)
 *   BTCUSD -> BTC/USD    (crypto pair)
 *   USDJPY -> USD/JPY    (fx pair)
 *   GCUSD  -> XAU/USD    (commodity)
 *   AAPL   -> AAPL
 */
export function toTdSymbol(symbol: string): string {
  const s = symbol.toUpperCase().trim();
  const idx = INDEX_PROXY[s];
  if (idx) return idx.proxy;
  if (COMMODITY_MAP[s]) return COMMODITY_MAP[s];
  if (s.includes("/")) return s;

  const kind = classify(s);
  if (kind === "crypto") return `${s.slice(0, -3)}/USD`;
  if (kind === "forex") return `${s.slice(0, 3)}/${s.slice(3)}`;
  return s;
}

/** True for the US index symbols Twelve Data does not sell (served from FMP). */
export function isProxiedIndex(symbol: string): boolean {
  return Boolean(INDEX_PROXY[symbol.toUpperCase()]);
}

/** Preferred display name for a symbol, falling back to the upstream name. */
export function displayName(symbol: string, upstream?: string): string {
  const idx = INDEX_PROXY[symbol.toUpperCase()];
  if (idx) return idx.name;
  return upstream || symbol;
}

/* ------------------------------------------------------------------ *
 * Quotes
 * ------------------------------------------------------------------ */

const n = (x: unknown): number => {
  const v = typeof x === "string" ? parseFloat(x) : (x as number);
  return Number.isFinite(v) ? v : 0;
};
const nOrNull = (x: unknown): number | null => {
  if (x === null || x === undefined || x === "") return null;
  const v = typeof x === "string" ? parseFloat(x) : (x as number);
  return Number.isFinite(v) ? v : null;
};

export interface TdQuoteRaw {
  symbol: string;
  name?: string;
  exchange?: string;
  mic_code?: string;
  currency?: string;
  datetime?: string;
  timestamp?: number;
  open?: string;
  high?: string;
  low?: string;
  close?: string;
  volume?: string;
  previous_close?: string;
  change?: string;
  percent_change?: string;
  average_volume?: string;
  is_market_open?: boolean;
  fifty_two_week?: {
    low?: string;
    high?: string;
    low_change?: string;
    high_change?: string;
    low_change_percent?: string;
    high_change_percent?: string;
    range?: string;
  };
}

/**
 * The quote shape the site's pages and components already consume. Field
 * names deliberately mirror Financial Modeling Prep so existing UI code and
 * the mobile app's API contract keep working unchanged.
 */
export interface Quote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changesPercentage: number;
  /** Alias — several components read `changePercent` instead. */
  changePercent: number;
  dayLow: number | null;
  dayHigh: number | null;
  yearLow: number | null;
  yearHigh: number | null;
  open: number | null;
  previousClose: number | null;
  volume: number;
  avgVolume: number;
  exchange: string;
  currency: string;
  timestamp: number;
  isMarketOpen: boolean;
  marketCap?: number | null;
  pe?: number | null;
  eps?: number | null;
  priceAvg50?: number | null;
  priceAvg200?: number | null;
}

export function normalizeQuote(raw: TdQuoteRaw, requested?: string): Quote {
  const sym = (requested || raw.symbol || "").toUpperCase();
  const price = n(raw.close);
  const prev = nOrNull(raw.previous_close);
  return {
    symbol: sym,
    name: displayName(sym, raw.name),
    price,
    change: n(raw.change),
    changesPercentage: n(raw.percent_change),
    changePercent: n(raw.percent_change),
    dayLow: nOrNull(raw.low),
    dayHigh: nOrNull(raw.high),
    yearLow: nOrNull(raw.fifty_two_week?.low),
    yearHigh: nOrNull(raw.fifty_two_week?.high),
    open: nOrNull(raw.open),
    previousClose: prev,
    volume: n(raw.volume),
    avgVolume: n(raw.average_volume),
    exchange: raw.exchange || "",
    currency: raw.currency || "USD",
    timestamp: raw.timestamp ? raw.timestamp * 1000 : Date.now(),
    isMarketOpen: Boolean(raw.is_market_open),
  };
}

/* ------------------------------------------------------------------ *
 * US indices, served from FMP
 *
 * Twelve Data does not sell US index symbols on this plan. Quoting the
 * tracking ETF under the index's name would print SPY's ~760 as the S&P
 * 500's level (~7,600), so index quotes and history come from FMP at their
 * real levels. Callers keep asking for "^GSPC" exactly as before.
 * ------------------------------------------------------------------ */

/** FMP's symbol for a site index symbol (the site's ^SPX is FMP's ^GSPC). */
const fmpIndexSymbol = (s: string) => (s.toUpperCase() === "^SPX" ? "^GSPC" : s.toUpperCase());

/** NYSE regular session, Mon–Fri 09:30–16:00 ET. Holidays are not modelled. */
function usMarketOpenNow(): boolean {
  const et = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = et.getDay();
  const minutes = et.getHours() * 60 + et.getMinutes();
  return day >= 1 && day <= 5 && minutes >= 570 && minutes < 960;
}

async function getIndexQuotes(symbols: string[], ttl: number): Promise<Quote[]> {
  if (symbols.length === 0) return [];
  const back = new Map<string, string[]>();
  for (const s of symbols) {
    const f = fmpIndexSymbol(s);
    back.set(f, [...(back.get(f) ?? []), s]);
  }
  const rows = await fmp<Record<string, unknown>[]>(
    `v3/quote/${[...back.keys()].map(encodeURIComponent).join(",")}`,
    {},
    ttl
  );
  const isOpen = usMarketOpenNow();
  const out: Quote[] = [];
  for (const r of Array.isArray(rows) ? rows : []) {
    for (const sym of back.get(String(r.symbol || "").toUpperCase()) ?? []) {
      out.push({
        symbol: sym,
        name: typeof r.name === "string" && r.name ? r.name : displayName(sym),
        price: n(r.price),
        change: n(r.change),
        changesPercentage: n(r.changesPercentage),
        changePercent: n(r.changesPercentage),
        dayLow: nOrNull(r.dayLow),
        dayHigh: nOrNull(r.dayHigh),
        yearLow: nOrNull(r.yearLow),
        yearHigh: nOrNull(r.yearHigh),
        open: nOrNull(r.open),
        previousClose: nOrNull(r.previousClose),
        volume: n(r.volume),
        avgVolume: n(r.avgVolume),
        exchange: "INDEX",
        currency: "USD",
        timestamp: typeof r.timestamp === "number" ? r.timestamp * 1000 : Date.now(),
        isMarketOpen: isOpen,
      });
    }
  }
  return out;
}

/** Twelve Data accepts comma-separated symbols; keep batches modest. */
const QUOTE_CHUNK = 60;

/**
 * Batch quotes. Accepts site symbols (indices, crypto, fx, commodities) and
 * returns them keyed by the symbol that was asked for, in the caller's order.
 */
export async function getQuotes(
  symbols: string[],
  opts: { ttl?: number } = {}
): Promise<Quote[]> {
  const wanted = Array.from(
    new Set(symbols.map((s) => s.toUpperCase().trim()).filter(Boolean))
  );
  if (wanted.length === 0) return [];
  const ttl = opts.ttl ?? 20_000;

  // Several site symbols can share one upstream symbol (BTCUSD and BTC/USD),
  // so map upstream -> [requested]. Indices go to FMP instead.
  const back = new Map<string, string[]>();
  for (const s of wanted) {
    if (isProxiedIndex(s)) continue;
    const td_ = toTdSymbol(s);
    const list = back.get(td_);
    if (list) list.push(s);
    else back.set(td_, [s]);
  }
  const upstream = [...back.keys()];

  const chunks: string[][] = [];
  for (let i = 0; i < upstream.length; i += QUOTE_CHUNK) {
    chunks.push(upstream.slice(i, i + QUOTE_CHUNK));
  }

  const [indexQuotes, results] = await Promise.all([
    getIndexQuotes(wanted.filter((s) => isProxiedIndex(s)), ttl),
    Promise.allSettled(
      chunks.map((chunk) =>
        td<Record<string, TdQuoteRaw> | TdQuoteRaw>(
          "quote",
          { symbol: chunk.join(","), dp: 5 },
          { ttl, cost: chunk.length }
        )
      )
    ),
  ]);

  const out: Quote[] = [...indexQuotes];
  results.forEach((res, i) => {
    if (res.status !== "fulfilled" || !res.value) return;
    const chunk = chunks[i];
    const payload = res.value;
    // A single-symbol request returns the object directly, not keyed.
    const rows: Record<string, TdQuoteRaw> =
      chunk.length === 1
        ? { [chunk[0]]: payload as TdQuoteRaw }
        : (payload as Record<string, TdQuoteRaw>);

    for (const up of chunk) {
      const raw = rows?.[up];
      if (!raw || typeof raw !== "object") continue;
      // Twelve Data marks per-symbol failures inside a batch.
      if ((raw as unknown as { status?: string }).status === "error") continue;
      for (const requested of back.get(up) || []) {
        out.push(normalizeQuote(raw, requested));
      }
    }
  });

  // Preserve the caller's ordering.
  const order = new Map(wanted.map((s, i) => [s, i]));
  out.sort((a, b) => (order.get(a.symbol) ?? 0) - (order.get(b.symbol) ?? 0));
  return out;
}

export async function getQuote(symbol: string): Promise<Quote | null> {
  const [q] = await getQuotes([symbol]);
  return q || null;
}

/** Lightweight price-only lookup (1 credit per symbol, smaller payload). */
export async function getPrices(symbols: string[]): Promise<Record<string, number>> {
  const wanted = Array.from(
    new Set(symbols.map((s) => s.toUpperCase().trim()).filter(Boolean))
  );
  if (!wanted.length) return {};
  const out: Record<string, number> = {};

  // Indices are priced from FMP at their real level (see getIndexQuotes).
  for (const q of await getIndexQuotes(wanted.filter((s) => isProxiedIndex(s)), 15_000)) {
    if (q.price > 0) out[q.symbol] = q.price;
  }

  const back = new Map(
    wanted.filter((s) => !isProxiedIndex(s)).map((s) => [toTdSymbol(s), s])
  );
  const upstream = [...back.keys()];

  for (let i = 0; i < upstream.length; i += QUOTE_CHUNK) {
    const chunk = upstream.slice(i, i + QUOTE_CHUNK);
    const res = await tdSafe<Record<string, { price?: string }> | { price?: string }>(
      "price",
      { symbol: chunk.join(",") },
      { ttl: 15_000, cost: chunk.length }
    );
    if (!res) continue;
    const rows =
      chunk.length === 1
        ? { [chunk[0]]: res as { price?: string } }
        : (res as Record<string, { price?: string }>);
    for (const up of chunk) {
      const p = nOrNull(rows?.[up]?.price);
      const requested = back.get(up);
      if (p !== null && requested) out[requested] = p;
    }
  }
  return out;
}

/**
 * Quote enriched with the valuation fields Twelve Data keeps on /statistics
 * (market cap, P/E, EPS, 50/200-day averages). Costs an extra credit.
 */
export async function getQuoteWithStats(symbol: string): Promise<Quote | null> {
  const [q, stats] = await Promise.all([
    getQuote(symbol),
    getStatistics(symbol),
  ]);
  if (!q) return null;
  if (stats) {
    q.marketCap = stats.marketCap;
    q.pe = stats.trailingPE;
    q.eps = stats.epsTTM;
    q.priceAvg50 = stats.day50MA;
    q.priceAvg200 = stats.day200MA;
  }
  return q;
}

/* ------------------------------------------------------------------ *
 * Statistics / profile
 * ------------------------------------------------------------------ */

export interface Statistics {
  marketCap: number | null;
  enterpriseValue: number | null;
  trailingPE: number | null;
  forwardPE: number | null;
  pegRatio: number | null;
  priceToSales: number | null;
  priceToBook: number | null;
  evToRevenue: number | null;
  evToEbitda: number | null;
  grossMargin: number | null;
  profitMargin: number | null;
  operatingMargin: number | null;
  roa: number | null;
  roe: number | null;
  revenueTTM: number | null;
  revenuePerShare: number | null;
  quarterlyRevenueGrowth: number | null;
  grossProfitTTM: number | null;
  ebitda: number | null;
  netIncomeTTM: number | null;
  epsTTM: number | null;
  quarterlyEarningsGrowth: number | null;
  totalCash: number | null;
  totalDebt: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  bookValuePerShare: number | null;
  operatingCashFlowTTM: number | null;
  freeCashFlowTTM: number | null;
  sharesOutstanding: number | null;
  floatShares: number | null;
  sharesShort: number | null;
  shortRatio: number | null;
  shortPercentOfFloat: number | null;
  percentHeldByInsiders: number | null;
  percentHeldByInstitutions: number | null;
  yearLow: number | null;
  yearHigh: number | null;
  yearChange: number | null;
  beta: number | null;
  day50MA: number | null;
  day200MA: number | null;
  dividendRate: number | null;
  dividendYield: number | null;
  payoutRatio: number | null;
  dividendDate: string | null;
  exDividendDate: string | null;
}

export async function getStatistics(symbol: string): Promise<Statistics | null> {
  const raw = await tdSafe<{ statistics?: Record<string, any> }>(
    "statistics",
    { symbol: toTdSymbol(symbol) },
    { ttl: 30 * 60_000, cost: 50 }
  );
  const s = raw?.statistics;
  if (!s) return null;
  const v = s.valuations_metrics || {};
  const f = s.financials || {};
  const inc = f.income_statement || {};
  const bs = f.balance_sheet || {};
  const cf = f.cash_flow || {};
  const st = s.stock_statistics || {};
  const sp = s.stock_price_summary || {};
  const ds = s.dividends_and_splits || {};

  return {
    marketCap: nOrNull(v.market_capitalization),
    enterpriseValue: nOrNull(v.enterprise_value),
    trailingPE: nOrNull(v.trailing_pe),
    forwardPE: nOrNull(v.forward_pe),
    pegRatio: nOrNull(v.peg_ratio),
    priceToSales: nOrNull(v.price_to_sales_ttm),
    priceToBook: nOrNull(v.price_to_book_mrq),
    evToRevenue: nOrNull(v.enterprise_to_revenue),
    evToEbitda: nOrNull(v.enterprise_to_ebitda),
    grossMargin: nOrNull(f.gross_margin),
    profitMargin: nOrNull(f.profit_margin),
    operatingMargin: nOrNull(f.operating_margin),
    roa: nOrNull(f.return_on_assets_ttm),
    roe: nOrNull(f.return_on_equity_ttm),
    revenueTTM: nOrNull(inc.revenue_ttm),
    revenuePerShare: nOrNull(inc.revenue_per_share_ttm),
    quarterlyRevenueGrowth: nOrNull(inc.quarterly_revenue_growth),
    grossProfitTTM: nOrNull(inc.gross_profit_ttm),
    ebitda: nOrNull(inc.ebitda),
    netIncomeTTM: nOrNull(inc.net_income_to_common_ttm),
    epsTTM: nOrNull(inc.diluted_eps_ttm),
    quarterlyEarningsGrowth: nOrNull(inc.quarterly_earnings_growth_yoy),
    totalCash: nOrNull(bs.total_cash_mrq),
    totalDebt: nOrNull(bs.total_debt_mrq),
    debtToEquity: nOrNull(bs.total_debt_to_equity_mrq),
    currentRatio: nOrNull(bs.current_ratio_mrq),
    bookValuePerShare: nOrNull(bs.book_value_per_share_mrq),
    operatingCashFlowTTM: nOrNull(cf.operating_cash_flow_ttm),
    freeCashFlowTTM: nOrNull(cf.levered_free_cash_flow_ttm),
    sharesOutstanding: nOrNull(st.shares_outstanding),
    floatShares: nOrNull(st.float_shares),
    sharesShort: nOrNull(st.shares_short),
    shortRatio: nOrNull(st.short_ratio),
    shortPercentOfFloat: nOrNull(st.short_percent_of_shares_outstanding),
    percentHeldByInsiders: nOrNull(st.percent_held_by_insiders),
    percentHeldByInstitutions: nOrNull(st.percent_held_by_institutions),
    yearLow: nOrNull(sp.fifty_two_week_low),
    yearHigh: nOrNull(sp.fifty_two_week_high),
    yearChange: nOrNull(sp.fifty_two_week_change),
    beta: nOrNull(sp.beta),
    day50MA: nOrNull(sp.day_50_ma),
    day200MA: nOrNull(sp.day_200_ma),
    dividendRate: nOrNull(ds.forward_annual_dividend_rate),
    dividendYield: nOrNull(ds.forward_annual_dividend_yield),
    payoutRatio: nOrNull(ds.payout_ratio),
    dividendDate: ds.dividend_date || null,
    exDividendDate: ds.ex_dividend_date || null,
  };
}

export interface Profile {
  symbol: string;
  companyName: string;
  exchange: string;
  sector: string;
  industry: string;
  employees: number | null;
  website: string;
  description: string;
  ceo: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
  type: string;
  image: string;
}

export async function getProfile(symbol: string): Promise<Profile | null> {
  const s = toTdSymbol(symbol);
  const [raw, image] = await Promise.all([
    tdSafe<Record<string, any>>(
      "profile",
      { symbol: s },
      { ttl: 6 * 60 * 60_000, cost: 10 }
    ),
    getLogo(symbol),
  ]);
  if (!raw) return null;
  return {
    symbol: symbol.toUpperCase(),
    companyName: displayName(symbol, raw.name),
    exchange: raw.exchange || "",
    sector: raw.sector || "",
    industry: raw.industry || "",
    employees: nOrNull(raw.employees),
    website: raw.website || "",
    description: raw.description || "",
    ceo: raw.CEO || "",
    address: [raw.address, raw.address2].filter(Boolean).join(", "),
    city: raw.city || "",
    state: raw.state || "",
    zip: raw.zip || "",
    country: raw.country || "",
    phone: raw.phone || "",
    type: raw.type || "",
    image,
  };
}

/**
 * Logo URL for a symbol, or "" when there is none. `/logo` answers with JSON
 * pointing at a public, keyless image URL, which is safe to hand to the
 * browser.
 */
export async function getLogo(symbol: string): Promise<string> {
  const raw = await tdSafe<{ url?: string }>(
    "logo",
    { symbol: toTdSymbol(symbol) },
    { ttl: 24 * 60 * 60_000 }
  );
  return typeof raw?.url === "string" ? raw.url : "";
}

/* ------------------------------------------------------------------ *
 * Time series
 * ------------------------------------------------------------------ */

export interface Bar {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export async function getTimeSeries(
  symbol: string,
  interval: string,
  outputsize = 200,
  opts: { ttl?: number; timezone?: string; startDate?: string; endDate?: string } = {}
): Promise<Bar[]> {
  if (isProxiedIndex(symbol)) return getIndexSeries(symbol, interval, outputsize, opts);

  const raw = await tdSafe<{ values?: Record<string, string>[] }>(
    "time_series",
    {
      symbol: toTdSymbol(symbol),
      interval,
      outputsize,
      timezone: opts.timezone ?? "America/New_York",
      start_date: opts.startDate,
      end_date: opts.endDate,
      order: "ASC",
    },
    { ttl: opts.ttl ?? 60_000 }
  );
  if (!Array.isArray(raw?.values)) return [];
  return raw.values
    .map((r) => ({
      t: r.datetime,
      o: n(r.open),
      h: n(r.high),
      l: n(r.low),
      c: n(r.close),
      v: n(r.volume),
    }))
    .filter((b) => b.c > 0);
}

/** FMP's intraday intervals, keyed by the Twelve Data interval name. */
const FMP_INTRADAY: Record<string, string> = {
  "1min": "1min",
  "5min": "5min",
  "15min": "15min",
  "30min": "30min",
  "1h": "1hour",
  "4h": "4hour",
};

/** Merge ascending daily bars into weekly (Monday-keyed) or monthly bars. */
function rollUp(daily: Bar[], interval: "1week" | "1month"): Bar[] {
  const out: Bar[] = [];
  let key = "";
  for (const b of daily) {
    const day = new Date(`${b.t.slice(0, 10)}T00:00:00Z`);
    const k =
      interval === "1month"
        ? b.t.slice(0, 7)
        : new Date(day.getTime() - ((day.getUTCDay() + 6) % 7) * 86_400_000)
            .toISOString()
            .slice(0, 10);
    const last = out[out.length - 1];
    if (last && k === key) {
      last.h = Math.max(last.h, b.h);
      last.l = Math.min(last.l, b.l);
      last.c = b.c;
      last.v += b.v;
    } else {
      out.push({ ...b });
      key = k;
    }
  }
  return out;
}

/**
 * Index history from FMP, shaped like getTimeSeries' Twelve Data output:
 * ascending bars with ET timestamps. Weekly and monthly bars are rolled up
 * from daily history; intervals FMP does not carry (45min, 2h) return none.
 */
async function getIndexSeries(
  symbol: string,
  interval: string,
  outputsize: number,
  opts: { ttl?: number; startDate?: string; endDate?: string }
): Promise<Bar[]> {
  const sym = encodeURIComponent(fmpIndexSymbol(symbol));
  const ttl = opts.ttl ?? 60_000;
  const range = { from: opts.startDate, to: opts.endDate };
  const toBar = (r: Record<string, unknown>): Bar => ({
    t: String(r.date ?? ""),
    o: n(r.open),
    h: n(r.high),
    l: n(r.low),
    c: n(r.close),
    v: n(r.volume),
  });

  let bars: Bar[];
  const intraday = FMP_INTRADAY[interval];
  if (intraday) {
    const rows = await fmp<Record<string, unknown>[]>(
      `v3/historical-chart/${intraday}/${sym}`,
      range,
      ttl
    );
    // FMP lists newest first.
    bars = (Array.isArray(rows) ? rows : []).map(toBar).reverse();
  } else if (interval === "1day" || interval === "1week" || interval === "1month") {
    const perBar = interval === "1week" ? 5 : interval === "1month" ? 21 : 1;
    const raw = await fmp<{ historical?: Record<string, unknown>[] }>(
      `v3/historical-price-full/${sym}`,
      opts.startDate ? range : { timeseries: (outputsize + 1) * perBar },
      ttl
    );
    const daily = (Array.isArray(raw?.historical) ? raw.historical : []).map(toBar).reverse();
    bars = interval === "1day" ? daily : rollUp(daily, interval);
  } else {
    return [];
  }
  return bars.filter((b) => b.c > 0).slice(-outputsize);
}

/**
 * Multi-horizon percent performance, computed from one daily series per
 * symbol. Replaces FMP's stock-price-change endpoint, which has no Twelve
 * Data counterpart.
 */
export interface Performance {
  "1D": number | null;
  "5D": number | null;
  "1M": number | null;
  "3M": number | null;
  "6M": number | null;
  ytd: number | null;
  "1Y": number | null;
  "3Y": number | null;
  "5Y": number | null;
}

export function performanceFromBars(bars: Bar[]): Performance {
  if (bars.length < 2) {
    return { "1D": null, "5D": null, "1M": null, "3M": null, "6M": null, ytd: null, "1Y": null, "3Y": null, "5Y": null };
  }
  const last = bars[bars.length - 1];
  const pct = (from: number | undefined | null) =>
    from && from !== 0 ? ((last.c - from) / from) * 100 : null;

  // Return null rather than clamping to the oldest bar: clamping would make
  // 3Y and 5Y report the same figure whenever the series is shorter than the
  // lookback, which reads as real data but is not.
  const back = (days: number): number | null => {
    const i = bars.length - 1 - days;
    return i >= 0 ? bars[i].c : null;
  };

  const year = last.t.slice(0, 4);
  const firstOfYear = bars.find((b) => b.t.slice(0, 4) === year)?.c;

  return {
    "1D": pct(back(1)),
    "5D": pct(back(5)),
    "1M": pct(back(21)),
    "3M": pct(back(63)),
    "6M": pct(back(126)),
    ytd: pct(firstOfYear),
    "1Y": pct(back(252)),
    "3Y": pct(back(756)),
    "5Y": pct(back(1260)),
  };
}

/* ------------------------------------------------------------------ *
 * Market movers
 * ------------------------------------------------------------------ */

export type MoverMarket = "stocks" | "etf" | "mutual_funds" | "forex" | "crypto";

export interface Mover {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changesPercentage: number;
  changePercent: number;
  volume: number;
  exchange: string;
}

/**
 * Exchange test tickers. NASDAQ publishes ZVZZT and friends as permanent test
 * instruments; they print absurd moves and would otherwise top the gainers.
 */
const TEST_TICKERS = /^(ZVZZT|ZWZZT|ZXZZT|ZJZZT|ZBZX|ZBZZT|ZTEST|IBM_TEST)$/;

export async function getMovers(
  direction: "gainers" | "losers",
  opts: { market?: MoverMarket; outputsize?: number; country?: string; priceGreaterThan?: number } = {}
): Promise<Mover[]> {
  const market = opts.market || "stocks";
  const raw = await tdSafe<{ values?: Record<string, any>[] }>(
    `market_movers/${market}`,
    {
      direction,
      outputsize: opts.outputsize ?? 30,
      country: opts.country ?? "United States",
      price_greater_than: opts.priceGreaterThan ?? (market === "stocks" ? 3 : undefined),
    },
    // market_movers is billed at 100 credits.
    { ttl: 60_000, cost: 100 }
  );
  if (!Array.isArray(raw?.values)) return [];
  return raw.values
    .map((r) => ({
      symbol: String(r.symbol || ""),
      name: String(r.name || r.symbol || ""),
      price: n(r.last),
      change: n(r.change),
      changesPercentage: n(r.percent_change),
      changePercent: n(r.percent_change),
      volume: n(r.volume),
      exchange: String(r.exchange || ""),
    }))
    .filter((m) => {
      if (!m.symbol || m.price <= 0) return false;
      if (market !== "stocks" && market !== "etf") return true;
      // Drop exchange test instruments and foreign share-class lines
      // (".UN", ".TO") that slip past the country filter.
      if (TEST_TICKERS.test(m.symbol)) return false;
      if (m.symbol.includes(".")) return false;
      return true;
    });
}

/**
 * "Most active" has no dedicated endpoint. Twelve Data's movers lists carry
 * volume, so the two sides are merged and re-ranked by turnover.
 */
export async function getMostActive(limit = 30): Promise<Mover[]> {
  const [up, down] = await Promise.all([
    getMovers("gainers", { outputsize: 50 }),
    getMovers("losers", { outputsize: 50 }),
  ]);
  const seen = new Map<string, Mover>();
  for (const m of [...up, ...down]) {
    if (!seen.has(m.symbol)) seen.set(m.symbol, m);
  }
  return [...seen.values()]
    .sort((a, b) => b.volume * b.price - a.volume * a.price)
    .slice(0, limit);
}

/* ------------------------------------------------------------------ *
 * Sector performance — synthesised from the SPDR sector ETFs, since
 * Twelve Data has no sector-performance endpoint.
 * ------------------------------------------------------------------ */

export const SECTOR_ETFS: { etf: string; sector: string }[] = [
  { etf: "XLK", sector: "Technology" },
  { etf: "XLF", sector: "Financials" },
  { etf: "XLV", sector: "Healthcare" },
  { etf: "XLY", sector: "Consumer Discretionary" },
  { etf: "XLP", sector: "Consumer Staples" },
  { etf: "XLE", sector: "Energy" },
  { etf: "XLI", sector: "Industrials" },
  { etf: "XLB", sector: "Materials" },
  { etf: "XLRE", sector: "Real Estate" },
  { etf: "XLU", sector: "Utilities" },
  { etf: "XLC", sector: "Communication Services" },
];

export async function getSectorPerformance(): Promise<
  { sector: string; etf: string; changesPercentage: number; price: number }[]
> {
  const quotes = await getQuotes(SECTOR_ETFS.map((s) => s.etf), { ttl: 60_000 });
  const by = new Map(quotes.map((q) => [q.symbol, q]));
  return SECTOR_ETFS.map(({ etf, sector }) => {
    const q = by.get(etf);
    return {
      sector,
      etf,
      changesPercentage: q?.changesPercentage ?? 0,
      price: q?.price ?? 0,
    };
  }).sort((a, b) => b.changesPercentage - a.changesPercentage);
}

/* ------------------------------------------------------------------ *
 * Search
 * ------------------------------------------------------------------ */

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: AssetClass;
  country?: string;
  currency?: string;
}

const TYPE_MAP: Record<string, AssetClass> = {
  "Common Stock": "stock",
  "American Depositary Receipt": "stock",
  "Preferred Stock": "stock",
  ETF: "etf",
  "Exchange-Traded Note": "etf",
  Index: "index",
  "Digital Currency": "crypto",
  "Physical Currency": "forex",
  Commodity: "commodity",
};

export async function searchSymbols(query: string, limit = 30): Promise<SearchResult[]> {
  const raw = await tdSafe<{ data?: Record<string, any>[] }>(
    "symbol_search",
    { symbol: query, outputsize: limit },
    { ttl: 10 * 60_000 }
  );
  if (!Array.isArray(raw?.data)) return [];
  return raw.data.map((r) => ({
    symbol: String(r.symbol || ""),
    name: String(r.instrument_name || r.symbol || ""),
    exchange: String(r.exchange || ""),
    type: TYPE_MAP[String(r.instrument_type)] || "stock",
    country: r.country,
    currency: r.currency,
  }));
}

/* ------------------------------------------------------------------ *
 * Market status
 * ------------------------------------------------------------------ */

export interface MarketState {
  name: string;
  code: string;
  country: string;
  isOpen: boolean;
  timeToOpen: string;
  timeToClose: string;
}

export async function getMarketState(exchange = "NASDAQ"): Promise<MarketState | null> {
  const raw = await tdSafe<Record<string, any>[]>(
    "market_state",
    { exchange },
    { ttl: 60_000 }
  );
  const row = Array.isArray(raw) ? raw[0] : null;
  if (!row) return null;
  return {
    name: row.name,
    code: row.code,
    country: row.country,
    isOpen: Boolean(row.is_market_open),
    timeToOpen: row.time_to_open || "",
    timeToClose: row.time_to_close || "",
  };
}

/* ------------------------------------------------------------------ *
 * Calendars
 * ------------------------------------------------------------------ */

export interface EarningsEvent {
  date: string;
  symbol: string;
  name: string;
  time: string;
  epsEstimate: number | null;
  epsActual: number | null;
  revenueEstimate: number | null;
  revenueActual: number | null;
  exchange: string;
}

export async function getEarningsCalendar(
  startDate?: string,
  endDate?: string
): Promise<EarningsEvent[]> {
  const raw = await tdSafe<{ earnings?: Record<string, Record<string, any>[]> }>(
    "earnings_calendar",
    { start_date: startDate, end_date: endDate },
    { ttl: 15 * 60_000, cost: 40 }
  );
  const byDate = raw?.earnings;
  if (!byDate || typeof byDate !== "object") return [];
  const out: EarningsEvent[] = [];
  for (const [date, rows] of Object.entries(byDate)) {
    if (!Array.isArray(rows)) continue;
    for (const r of rows) {
      out.push({
        date,
        symbol: String(r.symbol || ""),
        name: String(r.name || r.symbol || ""),
        time: String(r.time || ""),
        epsEstimate: nOrNull(r.eps_estimate),
        epsActual: nOrNull(r.eps_actual),
        revenueEstimate: nOrNull(r.revenue_estimate),
        revenueActual: nOrNull(r.revenue_actual),
        exchange: String(r.exchange || ""),
      });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export interface IpoEvent {
  date: string;
  symbol: string;
  name: string;
  exchange: string;
  priceRangeLow: number | null;
  priceRangeHigh: number | null;
  offerPrice: number | null;
  shares: number | null;
  currency: string;
}

export async function getIpoCalendar(): Promise<IpoEvent[]> {
  const raw = await tdSafe<Record<string, Record<string, any>[]>>(
    "ipo_calendar",
    {},
    { ttl: 60 * 60_000, cost: 20 }
  );
  if (!raw || typeof raw !== "object") return [];
  const out: IpoEvent[] = [];
  for (const [date, rows] of Object.entries(raw)) {
    if (!Array.isArray(rows)) continue;
    for (const r of rows) {
      out.push({
        date,
        symbol: String(r.symbol || ""),
        name: String(r.name || r.symbol || ""),
        exchange: String(r.exchange || ""),
        priceRangeLow: nOrNull(r.price_range_low),
        priceRangeHigh: nOrNull(r.price_range_high),
        offerPrice: nOrNull(r.offer_price),
        shares: nOrNull(r.shares),
        currency: String(r.currency || "USD"),
      });
    }
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getDividendsCalendar(
  startDate?: string,
  endDate?: string
): Promise<{ date: string; symbol: string; amount: number; exchange: string }[]> {
  const raw = await tdSafe<Record<string, any>[]>(
    "dividends_calendar",
    { start_date: startDate, end_date: endDate },
    { ttl: 60 * 60_000, cost: 20 }
  );
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => ({
    date: String(r.ex_date || ""),
    symbol: String(r.symbol || ""),
    amount: n(r.amount),
    exchange: String(r.exchange || ""),
  }));
}

export async function getSplitsCalendar(
  startDate?: string,
  endDate?: string
): Promise<{ date: string; symbol: string; ratio: number; description: string }[]> {
  const raw = await tdSafe<Record<string, any>[]>(
    "splits_calendar",
    { start_date: startDate, end_date: endDate },
    { ttl: 60 * 60_000, cost: 20 }
  );
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => ({
    date: String(r.date || ""),
    symbol: String(r.symbol || ""),
    ratio: n(r.ratio),
    description: String(r.description || ""),
  }));
}

/* ------------------------------------------------------------------ *
 * Currencies & commodities
 * ------------------------------------------------------------------ */

export async function getExchangeRate(pair: string): Promise<number | null> {
  const raw = await tdSafe<{ rate?: number }>(
    "exchange_rate",
    { symbol: pair.includes("/") ? pair : `${pair.slice(0, 3)}/${pair.slice(3)}` },
    { ttl: 60_000 }
  );
  return nOrNull(raw?.rate);
}

export async function convertCurrency(
  from: string,
  to: string,
  amount: number
): Promise<number | null> {
  const raw = await tdSafe<{ amount?: number }>(
    "currency_conversion",
    { symbol: `${from}/${to}`, amount },
    { ttl: 60_000 }
  );
  return nOrNull(raw?.amount);
}

/** Commodity symbols the site surfaces, in display order. */
export const COMMODITIES: { symbol: string; name: string; unit: string }[] = [
  { symbol: "XAU/USD", name: "Gold", unit: "oz" },
  { symbol: "XAG/USD", name: "Silver", unit: "oz" },
  { symbol: "XPT/USD", name: "Platinum", unit: "oz" },
  { symbol: "XPD/USD", name: "Palladium", unit: "oz" },
  { symbol: "CL1", name: "Crude Oil WTI", unit: "bbl" },
  { symbol: "BRN1", name: "Brent Crude", unit: "bbl" },
  { symbol: "NG1", name: "Natural Gas", unit: "MMBtu" },
  { symbol: "HG1", name: "Copper", unit: "lb" },
  { symbol: "C_1", name: "Corn", unit: "bu" },
  { symbol: "W_1", name: "Wheat", unit: "bu" },
  { symbol: "S_1", name: "Soybeans", unit: "bu" },
  { symbol: "KC1", name: "Coffee", unit: "lb" },
  { symbol: "CC1", name: "Cocoa", unit: "t" },
  { symbol: "SB1", name: "Sugar", unit: "lb" },
];

/* ------------------------------------------------------------------ *
 * Technical indicators
 * ------------------------------------------------------------------ */

/**
 * Any Twelve Data indicator, returned newest-first as {datetime, ...values}.
 * e.g. indicator("AAPL", "rsi", "1day", { time_period: 14 })
 */
export async function indicator(
  symbol: string,
  name: string,
  interval = "1day",
  params: Record<string, string | number> = {},
  outputsize = 100
): Promise<Record<string, string>[]> {
  const raw = await tdSafe<{ values?: Record<string, string>[] }>(
    name,
    { symbol: toTdSymbol(symbol), interval, outputsize, ...params },
    { ttl: 5 * 60_000 }
  );
  return Array.isArray(raw?.values) ? raw.values : [];
}

/** Latest single reading of an indicator. */
export async function latestIndicator(
  symbol: string,
  name: string,
  interval = "1day",
  params: Record<string, string | number> = {}
): Promise<Record<string, string> | null> {
  const rows = await indicator(symbol, name, interval, params, 1);
  return rows[0] || null;
}

/* ------------------------------------------------------------------ *
 * Misc helpers used across routes
 * ------------------------------------------------------------------ */

export { n as toNumber, nOrNull as toNumberOrNull };
