// api/cron/cache-warm/route.ts
// Cron job to pre-warm cache for popular stocks and trending data
// Runs every 2 minutes to keep hot data fresh
// Gracefully handles missing KV configuration
//
// Prices and movers from Twelve Data (@/lib/twelvedata), valuation fields from
// one FMP batch quote (@/lib/fmp). The `quote:<SYMBOL>` entries are served
// verbatim by /api/mobile/quotes, so they are written in that route's Quote
// shape — the two must stay in sync.

import { NextRequest, NextResponse } from "next/server";
import {
  getQuotes,
  getMovers,
  getMostActive,
  type Quote as TdQuote,
} from "@/lib/twelvedata";
import { getQuoteStats, type QuoteStats } from "@/lib/fmp";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60 seconds for this cron job

const CRON_SECRET = process.env.CRON_SECRET;
const KV_CONFIGURED = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

// Popular symbols to always keep warm
const HOT_SYMBOLS = [
  // Major indices ETFs
  "SPY", "QQQ", "DIA", "IWM", "VTI",
  // Mega caps
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "BRK.B",
  // Popular tech
  "AMD", "INTC", "CRM", "NFLX", "PYPL", "SQ", "SHOP", "COIN",
  // Popular finance
  "JPM", "BAC", "GS", "V", "MA",
  // Popular energy
  "XOM", "CVX", "OXY",
  // Popular healthcare
  "JNJ", "UNH", "PFE", "MRNA",
];

const INDEX_SYMBOLS = ["^GSPC", "^DJI", "^IXIC", "^RUT", "^VIX"];

// Mirrors the Quote wire shape in /api/mobile/quotes.
interface Quote {
  symbol: string;
  name: string;
  price: number;
  changesPercentage: number;
  change: number;
  dayLow: number | null;
  dayHigh: number | null;
  yearHigh: number | null;
  yearLow: number | null;
  marketCap: number | null;
  priceAvg50: number | null;
  priceAvg200: number | null;
  volume: number;
  avgVolume: number;
  exchange: string;
  open: number | null;
  previousClose: number | null;
  eps: number | null;
  pe: number | null;
  sharesOutstanding: number | null;
  timestamp: number;
}

// Lazy load KV only if configured
async function getKV() {
  if (!KV_CONFIGURED) return null;
  try {
    const { kv } = await import("@vercel/kv");
    return kv;
  } catch {
    return null;
  }
}

function toAppQuote(q: TdQuote, s: QuoteStats | null): Quote {
  return {
    symbol: q.symbol,
    name: q.name,
    price: q.price,
    changesPercentage: q.changesPercentage,
    change: q.change,
    dayLow: q.dayLow,
    dayHigh: q.dayHigh,
    yearHigh: q.yearHigh ?? null,
    yearLow: q.yearLow ?? null,
    marketCap: s?.marketCap ?? null,
    priceAvg50: s?.priceAvg50 ?? null,
    priceAvg200: s?.priceAvg200 ?? null,
    volume: q.volume,
    avgVolume: q.avgVolume,
    exchange: q.exchange,
    open: q.open,
    previousClose: q.previousClose,
    eps: s?.eps ?? null,
    pe: s?.pe ?? null,
    sharesOutstanding: s?.sharesOutstanding ?? null,
    timestamp: Math.floor(q.timestamp / 1000),
  };
}

// Batch quote + best-effort FMP valuation fields. Never throws.
async function fetchQuotes(symbols: string[]): Promise<Quote[]> {
  if (symbols.length === 0) return [];
  try {
    const quotes = await getQuotes(symbols);
    if (quotes.length === 0) return [];
    const stats = await getQuoteStats(quotes.map((q) => q.symbol)).catch(
      () => ({}) as Record<string, QuoteStats>
    );
    return quotes.map((q) => toAppQuote(q, stats[q.symbol.toUpperCase()] ?? null));
  } catch (err) {
    console.error("Cache warm: quote fetch failed:", err);
    return [];
  }
}

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret for security (optional but recommended)
    const authHeader = req.headers.get("authorization");
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const kv = await getKV();

    // If KV is not configured, just return success (nothing to warm)
    if (!kv) {
      return NextResponse.json({
        success: true,
        message: "KV not configured - skipping cache warm",
        kvEnabled: false,
        timestamp: new Date().toISOString(),
      });
    }

    const startTime = Date.now();
    let cachedCount = 0;
    let errorCount = 0;

    // 1. Warm popular stock quotes
    try {
      const quotes = await fetchQuotes(HOT_SYMBOLS);

      // Cache each quote with 30-second TTL
      const cachePromises = quotes.map((quote) =>
        kv.set(`quote:${quote.symbol}`, quote, { ex: 30 }).catch((err) => {
          console.warn(`Failed to cache ${quote.symbol}:`, err);
          errorCount++;
        })
      );

      await Promise.all(cachePromises);
      cachedCount += quotes.length;
    } catch (err) {
      console.error("Failed to warm popular quotes:", err);
      errorCount++;
    }

    // 2. Warm trending/gainers/losers
    try {
      // market_movers costs 100 credits per call. Ask for 50 rows on each side
      // — the exact request getMostActive() makes internally — so the actives
      // list is assembled from the client's 60s cache instead of paying twice.
      const [gainersRaw, losersRaw] = await Promise.all([
        getMovers("gainers", { outputsize: 50 }),
        getMovers("losers", { outputsize: 50 }),
      ]);
      const actives = await getMostActive(20);

      const gainers = gainersRaw.slice(0, 20);
      const losers = losersRaw.slice(0, 20);

      // Cache market movers with 60-second TTL
      await Promise.all([
        kv.set("market:gainers", gainers, { ex: 60 }).catch(() => errorCount++),
        kv.set("market:losers", losers, { ex: 60 }).catch(() => errorCount++),
        kv.set("market:actives", actives, { ex: 60 }).catch(() => errorCount++),
      ]);
      cachedCount += 3;

      // Also cache individual quotes from these lists
      const allSymbols = [
        ...gainers.map((s) => s.symbol),
        ...losers.map((s) => s.symbol),
        ...actives.map((s) => s.symbol),
      ].filter(Boolean).slice(0, 50);

      const uniqueSymbols = [...new Set(allSymbols)].filter(
        (s) => !HOT_SYMBOLS.includes(s)
      );

      if (uniqueSymbols.length > 0) {
        const moverQuotes = await fetchQuotes(uniqueSymbols);
        const moverCachePromises = moverQuotes.map((quote) =>
          kv.set(`quote:${quote.symbol}`, quote, { ex: 30 }).catch(() => errorCount++)
        );
        await Promise.all(moverCachePromises);
        cachedCount += moverQuotes.length;
      }
    } catch (err) {
      console.error("Failed to warm market movers:", err);
      errorCount++;
    }

    // 3. Warm major indices
    // Twelve Data does not sell US index symbols on this plan, so these are
    // quoted through their ETF proxies. The caret symbol and index name are
    // preserved; only the price level belongs to the fund.
    try {
      const indices = await getQuotes(INDEX_SYMBOLS);

      if (indices.length > 0) {
        await kv.set("market:indices", indices, { ex: 60 }).catch(() => errorCount++);
        cachedCount += 1;
      }
    } catch (err) {
      console.error("Failed to warm indices:", err);
      errorCount++;
    }

    const duration = Date.now() - startTime;

    console.log(`Cache warm completed: ${cachedCount} items cached, ${errorCount} errors, ${duration}ms`);

    return NextResponse.json({
      success: true,
      cached: cachedCount,
      errors: errorCount,
      kvEnabled: true,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cache warm cron error:", error);
    return NextResponse.json(
      { error: "Cache warm failed", details: String(error) },
      { status: 500 }
    );
  }
}
