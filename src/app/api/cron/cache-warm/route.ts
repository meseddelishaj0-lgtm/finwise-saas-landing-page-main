// api/cron/cache-warm/route.ts
// Cron job to pre-warm cache for popular stocks and trending data
// Runs every 2 minutes to keep hot data fresh
// Gracefully handles missing KV configuration

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60 seconds for this cron job

const FMP_API_KEY = process.env.FMP_API_KEY;
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

interface Quote {
  symbol: string;
  name: string;
  price: number;
  changesPercentage: number;
  change: number;
  dayLow: number;
  dayHigh: number;
  yearHigh: number;
  yearLow: number;
  marketCap: number;
  volume: number;
  exchange: string;
  previousClose: number;
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

async function fetchQuotesFromFMP(symbols: string[]): Promise<Quote[]> {
  if (symbols.length === 0) return [];

  const symbolsParam = symbols.join(",");
  const url = `https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(symbolsParam)}?apikey=${FMP_API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) {
    console.error(`FMP API error: ${res.status}`);
    return [];
  }

  const data = await res.json();
  return Array.isArray(data) ? data : [];
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
      const quotes = await fetchQuotesFromFMP(HOT_SYMBOLS);

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
      const [gainers, losers, actives] = await Promise.all([
        fetch(`https://financialmodelingprep.com/api/v3/stock_market/gainers?limit=20&apikey=${FMP_API_KEY}`).then(r => r.json()),
        fetch(`https://financialmodelingprep.com/api/v3/stock_market/losers?limit=20&apikey=${FMP_API_KEY}`).then(r => r.json()),
        fetch(`https://financialmodelingprep.com/api/v3/stock_market/actives?limit=20&apikey=${FMP_API_KEY}`).then(r => r.json()),
      ]);

      // Cache market movers with 60-second TTL
      await Promise.all([
        kv.set("market:gainers", gainers, { ex: 60 }).catch(() => errorCount++),
        kv.set("market:losers", losers, { ex: 60 }).catch(() => errorCount++),
        kv.set("market:actives", actives, { ex: 60 }).catch(() => errorCount++),
      ]);
      cachedCount += 3;

      // Also cache individual quotes from these lists
      const allSymbols = [
        ...(Array.isArray(gainers) ? gainers.map((s: any) => s.symbol) : []),
        ...(Array.isArray(losers) ? losers.map((s: any) => s.symbol) : []),
        ...(Array.isArray(actives) ? actives.map((s: any) => s.symbol) : []),
      ].filter(Boolean).slice(0, 50);

      const uniqueSymbols = [...new Set(allSymbols)].filter(
        (s) => !HOT_SYMBOLS.includes(s)
      );

      if (uniqueSymbols.length > 0) {
        const moverQuotes = await fetchQuotesFromFMP(uniqueSymbols);
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
    try {
      const indices = await fetch(
        `https://financialmodelingprep.com/api/v3/quote/%5EGSPC,%5EDJI,%5EIXIC,%5ERUT,%5EVIX?apikey=${FMP_API_KEY}`
      ).then(r => r.json());

      if (Array.isArray(indices)) {
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
