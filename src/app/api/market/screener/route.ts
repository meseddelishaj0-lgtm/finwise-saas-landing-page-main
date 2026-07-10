import { NextResponse } from "next/server";

// Screener dataset: top ~1500 US stocks by market cap, enriched with
// live quote fields and multi-horizon performance. Powers /screener and
// /heatmap. Heavy upstream fan-out (≈20 FMP calls) hidden behind a
// 5-minute in-memory cache.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export interface ScreenerRow {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  exchange: string;
  price: number;
  chg: number; // 1D %
  mcap: number;
  vol: number;
  avgVol: number;
  relVol: number | null;
  dollarVol: number;
  pe: number | null;
  eps: number | null;
  beta: number | null;
  divYield: number | null; // %
  yearHigh: number | null;
  yearLow: number | null;
  fromHigh: number | null; // % below 52w high (≤ 0)
  fromLow: number | null; // % above 52w low (≥ 0)
  vs50: number | null; // % vs 50D MA
  vs200: number | null; // % vs 200D MA
  gap: number | null; // % open vs previous close
  dayPos: number | null; // 0–100 position in day range
  p1w: number | null;
  p1m: number | null;
  p3m: number | null;
  p6m: number | null;
  pytd: number | null;
  p1y: number | null;
  p3y: number | null;
  p5y: number | null;
}

const US_EXCHANGES = new Set(["NASDAQ", "NYSE", "AMEX"]);
const UNIVERSE_SIZE = 1500;
const CHUNK = 150;
const TTL = 5 * 60 * 1000;

let cache: { at: number; data: { updated: number; rows: ScreenerRow[] } } | null = null;
let inflight: Promise<{ updated: number; rows: ScreenerRow[] }> | null = null;

const num = (x: unknown): number | null => {
  const n = typeof x === "string" ? parseFloat(x) : (x as number);
  return Number.isFinite(n) ? n : null;
};

const pct = (a: number | null, b: number | null): number | null =>
  a != null && b != null && b !== 0 ? ((a - b) / Math.abs(b)) * 100 : null;

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`upstream ${res.status}`);
  return res.json();
}

async function buildDataset(): Promise<{ updated: number; rows: ScreenerRow[] }> {
  const key = process.env.FMP_API_KEY;
  if (!key) throw new Error("no key");
  const base = "https://financialmodelingprep.com/api/v3";

  // 1. Universe
  const uni = (await fetchJson(
    `${base}/stock-screener?marketCapMoreThan=500000000&exchange=NYSE,NASDAQ,AMEX&isActivelyTrading=true&limit=6000&apikey=${key}`
  )) as Record<string, unknown>[];

  const universe = uni
    .filter(
      (r) =>
        typeof r.symbol === "string" &&
        !r.symbol.includes(".") &&
        !r.isEtf &&
        !r.isFund &&
        US_EXCHANGES.has(String(r.exchangeShortName))
    )
    .sort((a, b) => (Number(b.marketCap) || 0) - (Number(a.marketCap) || 0))
    .slice(0, UNIVERSE_SIZE);

  const meta = new Map(
    universe.map((r) => [
      String(r.symbol),
      {
        sector: String(r.sector || "Other"),
        industry: String(r.industry || ""),
        beta: num(r.beta),
        lastDiv: num(r.lastAnnualDividend) || 0,
        exchange: String(r.exchangeShortName),
      },
    ])
  );

  // 2. Enrich in chunks: quotes + multi-horizon price change
  const symbols = universe.map((r) => String(r.symbol));
  const chunks: string[][] = [];
  for (let i = 0; i < symbols.length; i += CHUNK) chunks.push(symbols.slice(i, i + CHUNK));

  const quotes = new Map<string, Record<string, unknown>>();
  const perf = new Map<string, Record<string, unknown>>();

  await Promise.all(
    chunks.map(async (chunk) => {
      const list = chunk.join(",");
      const [qs, ps] = await Promise.allSettled([
        fetchJson(`${base}/quote/${list}?apikey=${key}`),
        fetchJson(`${base}/stock-price-change/${list}?apikey=${key}`),
      ]);
      if (qs.status === "fulfilled" && Array.isArray(qs.value)) {
        for (const q of qs.value as Record<string, unknown>[]) quotes.set(String(q.symbol), q);
      }
      if (ps.status === "fulfilled" && Array.isArray(ps.value)) {
        for (const p of ps.value as Record<string, unknown>[]) perf.set(String(p.symbol), p);
      }
    })
  );

  const rows: ScreenerRow[] = [];
  for (const symbol of symbols) {
    const q = quotes.get(symbol);
    const m = meta.get(symbol);
    if (!q || !m) continue;
    const price = num(q.price);
    const mcap = num(q.marketCap);
    if (!price || !mcap) continue;
    const p = perf.get(symbol) || {};
    const vol = num(q.volume) || 0;
    const avgVol = num(q.avgVolume) || 0;
    const dayLow = num(q.dayLow);
    const dayHigh = num(q.dayHigh);
    rows.push({
      symbol,
      name: String(q.name || symbol),
      sector: m.sector,
      industry: m.industry,
      exchange: m.exchange,
      price,
      chg: num(q.changesPercentage) || 0,
      mcap,
      vol,
      avgVol,
      relVol: avgVol > 0 ? vol / avgVol : null,
      dollarVol: vol * price,
      pe: num(q.pe),
      eps: num(q.eps),
      beta: m.beta,
      divYield: m.lastDiv > 0 ? (m.lastDiv / price) * 100 : 0,
      yearHigh: num(q.yearHigh),
      yearLow: num(q.yearLow),
      fromHigh: pct(price, num(q.yearHigh)),
      fromLow: pct(price, num(q.yearLow)),
      vs50: pct(price, num(q.priceAvg50)),
      vs200: pct(price, num(q.priceAvg200)),
      gap: pct(num(q.open), num(q.previousClose)),
      dayPos:
        dayLow != null && dayHigh != null && dayHigh > dayLow
          ? ((price - dayLow) / (dayHigh - dayLow)) * 100
          : null,
      p1w: num(p["5D"]),
      p1m: num(p["1M"]),
      p3m: num(p["3M"]),
      p6m: num(p["6M"]),
      pytd: num(p["ytd"]),
      p1y: num(p["1Y"]),
      p3y: num(p["3Y"]),
      p5y: num(p["5Y"]),
    });
  }

  return { updated: Date.now(), rows };
}

export async function GET() {
  if (cache && Date.now() - cache.at < TTL) {
    return NextResponse.json(cache.data);
  }
  try {
    if (!inflight) {
      inflight = buildDataset().finally(() => {
        inflight = null;
      });
    }
    const data = await inflight;
    cache = { at: Date.now(), data };
    return NextResponse.json(data);
  } catch {
    // Serve stale data on upstream failure
    if (cache) return NextResponse.json(cache.data);
    return NextResponse.json({ error: "Failed to build screener" }, { status: 500 });
  }
}
