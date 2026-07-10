import { NextResponse } from "next/server";

// Chart data proxy — Twelve Data for stocks/crypto/ETFs, FMP for indices
// (the Twelve Data plan doesn't include US indices). Keys stay server-side.
// Returns ascending bars: { t: "YYYY-MM-DD[ HH:MM:SS]", o, h, l, c, v }

export const dynamic = "force-dynamic";

interface Bar {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

type RangeKey = "1D" | "5D" | "1M" | "6M" | "1Y" | "5Y";

// cryptoOutputsize is larger because crypto trades 24/7 (e.g. 1h bars =
// 24/day vs ~7/day for stocks)
const RANGES: Record<
  RangeKey,
  { tdInterval: string; fmpIntraday: string | null; outputsize: number; cryptoOutputsize: number; dailyBars: number }
> = {
  "1D": { tdInterval: "5min", fmpIntraday: "5min", outputsize: 300, cryptoOutputsize: 300, dailyBars: 0 },
  "5D": { tdInterval: "15min", fmpIntraday: "15min", outputsize: 300, cryptoOutputsize: 500, dailyBars: 0 },
  "1M": { tdInterval: "1h", fmpIntraday: "1hour", outputsize: 160, cryptoOutputsize: 750, dailyBars: 0 },
  "6M": { tdInterval: "1day", fmpIntraday: null, outputsize: 140, cryptoOutputsize: 190, dailyBars: 132 },
  "1Y": { tdInterval: "1day", fmpIntraday: null, outputsize: 255, cryptoOutputsize: 370, dailyBars: 260 },
  "5Y": { tdInterval: "1week", fmpIntraday: null, outputsize: 262, cryptoOutputsize: 262, dailyBars: 1300 },
};

const cache = new Map<string, { at: number; data: Bar[] }>();
const ttlFor = (range: RangeKey) => (range === "1D" || range === "5D" ? 60_000 : 300_000);

const isCrypto = (s: string) => /^[A-Z]{2,6}USD$/.test(s) && !["GLD", "USO", "TLT"].includes(s);
const isIndex = (s: string) => s.startsWith("^");

// 6-letter currency pairs (USDJPY, EURGBP…) → Twelve Data slash format
const FX_CODES = new Set(["USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "NZD", "MXN", "CNY"]);
const asFxPair = (s: string): string | null => {
  if (s.length !== 6) return null;
  const a = s.slice(0, 3);
  const b = s.slice(3);
  return FX_CODES.has(a) && FX_CODES.has(b) ? `${a}/${b}` : null;
};

const num = (x: unknown) => {
  const n = typeof x === "string" ? parseFloat(x) : (x as number);
  return Number.isFinite(n) ? n : 0;
};

// Keep only bars from the last `n` distinct calendar dates (intraday ranges)
function lastNDates(bars: Bar[], n: number): Bar[] {
  const dates = Array.from(new Set(bars.map((b) => b.t.slice(0, 10)))).sort();
  const keep = new Set(dates.slice(-n));
  return bars.filter((b) => keep.has(b.t.slice(0, 10)));
}

// Aggregate consecutive daily bars into ~weekly bars (for FMP 5Y)
function aggregate(bars: Bar[], size: number): Bar[] {
  const out: Bar[] = [];
  for (let i = 0; i < bars.length; i += size) {
    const chunk = bars.slice(i, i + size);
    out.push({
      t: chunk[chunk.length - 1].t,
      o: chunk[0].o,
      h: Math.max(...chunk.map((b) => b.h)),
      l: Math.min(...chunk.map((b) => b.l)),
      c: chunk[chunk.length - 1].c,
      v: chunk.reduce((s, b) => s + b.v, 0),
    });
  }
  return out;
}

async function fromTwelveData(symbol: string, range: RangeKey): Promise<Bar[] | null> {
  const key = process.env.TWELVE_DATA_API_KEY;
  if (!key) return null;
  const cfg = RANGES[range];
  const fxPair = asFxPair(symbol);
  const crypto = isCrypto(symbol) && !fxPair;
  const tdSymbol = fxPair || (crypto ? `${symbol.slice(0, -3)}/USD` : symbol);
  // Crypto and forex trade around the clock — need more bars per range
  const outputsize = crypto || fxPair ? cfg.cryptoOutputsize : cfg.outputsize;
  const url =
    `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(tdSymbol)}` +
    `&interval=${cfg.tdInterval}&outputsize=${outputsize}&timezone=America/New_York&apikey=${key}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const json = await res.json();
  if (!Array.isArray(json?.values)) return null;
  const bars: Bar[] = json.values
    .map((r: Record<string, string>) => ({
      t: r.datetime,
      o: num(r.open),
      h: num(r.high),
      l: num(r.low),
      c: num(r.close),
      v: num(r.volume),
    }))
    .filter((b: Bar) => b.c > 0)
    .reverse(); // Twelve Data returns newest-first
  return bars.length ? bars : null;
}

async function fromFMP(symbol: string, range: RangeKey): Promise<Bar[] | null> {
  const key = process.env.FMP_API_KEY;
  if (!key) return null;
  const cfg = RANGES[range];
  const enc = encodeURIComponent(symbol);

  if (cfg.fmpIntraday) {
    const url = `https://financialmodelingprep.com/api/v3/historical-chart/${cfg.fmpIntraday}/${enc}?apikey=${key}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const rows = await res.json();
    if (!Array.isArray(rows)) return null;
    const bars: Bar[] = rows
      .map((r: Record<string, unknown>) => ({
        t: String(r.date),
        o: num(r.open),
        h: num(r.high),
        l: num(r.low),
        c: num(r.close),
        v: num(r.volume),
      }))
      .filter((b: Bar) => b.c > 0)
      .reverse();
    return bars.length ? bars : null;
  }

  const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${enc}?timeseries=${cfg.dailyBars}&apikey=${key}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const json = await res.json();
  const rows = json?.historical;
  if (!Array.isArray(rows)) return null;
  let bars: Bar[] = rows
    .map((r: Record<string, unknown>) => ({
      t: String(r.date),
      o: num(r.open),
      h: num(r.high),
      l: num(r.low),
      c: num(r.close),
      v: num(r.volume),
    }))
    .filter((b: Bar) => b.c > 0)
    .reverse();
  if (range === "5Y") bars = aggregate(bars, 5);
  return bars.length ? bars : null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get("symbol") || "").toUpperCase().trim();
  const range = (searchParams.get("range") || "1D") as RangeKey;

  if (!/^[A-Z0-9^./-]{1,12}$/.test(symbol) || !RANGES[range]) {
    return NextResponse.json({ error: "Invalid symbol or range" }, { status: 400 });
  }

  const cacheKey = `${symbol}|${range}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < ttlFor(range)) {
    return NextResponse.json(hit.data);
  }

  try {
    let bars: Bar[] | null = null;
    if (isIndex(symbol)) {
      bars = await fromFMP(symbol, range);
    } else {
      bars = await fromTwelveData(symbol, range);
      if (!bars) bars = await fromFMP(symbol, range);
    }
    if (!bars) return NextResponse.json({ error: "No data" }, { status: 404 });

    if (range === "1D") bars = lastNDates(bars, 1);
    if (range === "5D") bars = lastNDates(bars, 5);

    cache.set(cacheKey, { at: Date.now(), data: bars });
    return NextResponse.json(bars);
  } catch {
    return NextResponse.json({ error: "Failed to fetch chart" }, { status: 500 });
  }
}
