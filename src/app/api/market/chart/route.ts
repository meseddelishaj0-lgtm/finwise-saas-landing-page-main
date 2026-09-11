import { NextResponse } from "next/server";
import { classify, getTimeSeries, type Bar } from "@/lib/twelvedata";

// Chart data for the terminal. Returns ascending bars:
// { t: "YYYY-MM-DD[ HH:MM:SS]", o, h, l, c, v }
//
// getTimeSeries serves stocks, ETFs, crypto and FX from Twelve Data and US
// indices from FMP, so an index charts at its real level.

export const dynamic = "force-dynamic";

type RangeKey = "1D" | "5D" | "1M" | "6M" | "1Y" | "5Y";

// 24/7 markets need more bars to cover the same span: crypto and FX print
// around the clock where equities print roughly seven hourly bars a day.
const RANGES: Record<
  RangeKey,
  { interval: string; outputsize: number; roundTheClock: number }
> = {
  "1D": { interval: "5min", outputsize: 300, roundTheClock: 300 },
  "5D": { interval: "15min", outputsize: 300, roundTheClock: 500 },
  "1M": { interval: "1h", outputsize: 160, roundTheClock: 750 },
  "6M": { interval: "1day", outputsize: 140, roundTheClock: 190 },
  "1Y": { interval: "1day", outputsize: 255, roundTheClock: 370 },
  "5Y": { interval: "1week", outputsize: 262, roundTheClock: 262 },
};

const cache = new Map<string, { at: number; data: Bar[] }>();
const ttlFor = (range: RangeKey) => (range === "1D" || range === "5D" ? 60_000 : 300_000);

/** Keep only bars from the last `n` distinct calendar dates. */
function lastNDates(bars: Bar[], n: number): Bar[] {
  const dates = Array.from(new Set(bars.map((b) => b.t.slice(0, 10)))).sort();
  const keep = new Set(dates.slice(-n));
  return bars.filter((b) => keep.has(b.t.slice(0, 10)));
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

  const cfg = RANGES[range];
  const kind = classify(symbol);
  const alwaysOpen = kind === "crypto" || kind === "forex";

  let bars = await getTimeSeries(
    symbol,
    cfg.interval,
    alwaysOpen ? cfg.roundTheClock : cfg.outputsize,
    { ttl: ttlFor(range) }
  );
  if (range === "1D") bars = lastNDates(bars, 1);
  if (range === "5D") bars = lastNDates(bars, 5);

  if (bars.length === 0) {
    // Ride out an upstream failure with the last good series.
    if (hit) return NextResponse.json(hit.data);
    return NextResponse.json({ error: "No data" }, { status: 404 });
  }

  cache.set(cacheKey, { at: Date.now(), data: bars });
  return NextResponse.json(bars);
}
