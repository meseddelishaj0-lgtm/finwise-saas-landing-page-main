// api/mobile/quotes/route.ts
// Batch quotes endpoint for mobile app
// Reduces multiple API calls to one, with optional KV caching
//
// Prices come from Twelve Data (@/lib/twelvedata). The response envelope and
// every Quote field name below are the app's contract and are unchanged: the
// client helpers deliberately emit the previous provider's field names. The
// valuation fields (marketCap, pe, eps, priceAvg50, priceAvg200,
// sharesOutstanding) come from one FMP batch quote (@/lib/fmp), since Twelve
// Data only sells them via /statistics at 50 credits per symbol.
//
// Edge-safe: both clients use only fetch, Map, URLSearchParams and setTimeout.

import { NextRequest, NextResponse } from "next/server";
import { getQuotes, type Quote as TdQuote } from "@/lib/twelvedata";
import { getQuoteStats, type QuoteStats } from "@/lib/fmp";

export const runtime = "edge"; // Edge Runtime for faster global response
export const dynamic = "force-dynamic";

// Check if KV is configured
const KV_CONFIGURED = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

// Wire shape consumed by the React Native app. Fields that the upstream may
// not know are null (which is what the previous provider sent too) rather than
// a misleading 0.
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

// Shape a Twelve Data quote (+ optional FMP valuation fields) into the app's
// Quote. NOTE: /api/cron/cache-warm writes the same shape under
// `quote:<SYMBOL>`, so the two must stay in sync — a warmed entry is served
// verbatim from KV below.
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
    // Seconds since epoch, as the app has always received it.
    timestamp: Math.floor(q.timestamp / 1000),
  };
}

// Fetch quotes from Twelve Data. Never throws: an upstream failure yields an
// empty list so the route still answers with a well-formed envelope.
async function fetchQuotes(symbols: string[]): Promise<Quote[]> {
  if (symbols.length === 0) return [];

  try {
    const quotes = await getQuotes(symbols);
    if (quotes.length === 0) return [];

    // Valuation fields: one FMP batch quote. A failure just leaves them null.
    const stats = await getQuoteStats(quotes.map((q) => q.symbol)).catch(
      () => ({}) as Record<string, QuoteStats>
    );

    return quotes.map((q) => toAppQuote(q, stats[q.symbol.toUpperCase()] ?? null));
  } catch (err) {
    console.error("Twelve Data quote error:", err);
    return [];
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbolsParam = searchParams.get("symbols");

    if (!symbolsParam) {
      return NextResponse.json(
        { error: "symbols parameter is required" },
        { status: 400 }
      );
    }

    // Parse and validate symbols (max 50 to prevent abuse)
    const symbols = symbolsParam
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 0 && s.length <= 10)
      .slice(0, 50);

    if (symbols.length === 0) {
      return NextResponse.json({ quotes: [], cached: false });
    }

    const kv = await getKV();
    let quotes: Quote[] = [];
    let uncachedSymbols: string[] = symbols;
    let cachedCount = 0;

    // Try to get from KV cache if available
    if (kv) {
      try {
        const cacheKeys = symbols.map((s) => `quote:${s}`);
        const cachedResults: (Quote | null)[] = await Promise.all(
          cacheKeys.map((key) => kv.get<Quote>(key).catch(() => null))
        );

        uncachedSymbols = [];
        symbols.forEach((symbol, index) => {
          const cached = cachedResults[index];
          if (cached) {
            quotes.push(cached);
            cachedCount++;
          } else {
            uncachedSymbols.push(symbol);
          }
        });
      } catch (cacheError) {
        console.warn("KV cache read error:", cacheError);
        uncachedSymbols = symbols;
      }
    }

    // Fetch uncached quotes from Twelve Data
    if (uncachedSymbols.length > 0) {
      const freshQuotes = await fetchQuotes(uncachedSymbols);
      quotes.push(...freshQuotes);

      // Cache fresh quotes in KV if available (fire and forget)
      // Reduced from 30s to 15s for more real-time prices
      if (kv && freshQuotes.length > 0) {
        Promise.all(
          freshQuotes.map((quote) =>
            kv.set(`quote:${quote.symbol}`, quote, { ex: 15 }).catch(() => {})
          )
        ).catch(() => {});
      }
    }

    // Sort quotes to match original request order
    const symbolOrder = new Map(symbols.map((s, i) => [s, i]));
    quotes.sort((a, b) => {
      const orderA = symbolOrder.get(a.symbol) ?? 999;
      const orderB = symbolOrder.get(b.symbol) ?? 999;
      return orderA - orderB;
    });

    const response = NextResponse.json({
      quotes,
      cached: uncachedSymbols.length === 0,
      cachedCount,
      freshCount: uncachedSymbols.length,
      kvEnabled: KV_CONFIGURED,
      timestamp: Date.now(),
    });

    // Add cache headers for Vercel Edge Network
    // Reduced caching for more real-time prices
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=5, stale-while-revalidate=15"
    );

    return response;
  } catch (error) {
    console.error("Batch quotes error:", error);

    // Fallback: try a direct upstream fetch without any caching
    try {
      const { searchParams } = new URL(req.url);
      const symbolsParam = searchParams.get("symbols") || "";
      const symbols = symbolsParam.split(",").map(s => s.trim().toUpperCase()).filter(Boolean).slice(0, 50);
      const quotes = await fetchQuotes(symbols);

      return NextResponse.json({
        quotes,
        cached: false,
        cachedCount: 0,
        freshCount: quotes.length,
        kvEnabled: false,
        fallback: true,
        timestamp: Date.now(),
      });
    } catch (fallbackError) {
      return NextResponse.json(
        { error: "Failed to fetch quotes", quotes: [] },
        { status: 500 }
      );
    }
  }
}

// Also support POST for larger symbol lists
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const symbols: string[] = body.symbols || [];

    if (!Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json(
        { error: "symbols array is required" },
        { status: 400 }
      );
    }

    // Validate and limit symbols
    const validSymbols = symbols
      .map((s) => String(s).trim().toUpperCase())
      .filter((s) => s.length > 0 && s.length <= 10)
      .slice(0, 50);

    // Fetch all quotes upstream (simpler approach for POST)
    const quotes = await fetchQuotes(validSymbols);

    // Sort to match request order
    const symbolOrder = new Map(validSymbols.map((s, i) => [s, i]));
    quotes.sort((a, b) => {
      const orderA = symbolOrder.get(a.symbol) ?? 999;
      const orderB = symbolOrder.get(b.symbol) ?? 999;
      return orderA - orderB;
    });

    return NextResponse.json({
      quotes,
      cached: false,
      cachedCount: 0,
      freshCount: quotes.length,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Batch quotes POST error:", error);
    return NextResponse.json(
      { error: "Failed to fetch quotes", quotes: [] },
      { status: 500 }
    );
  }
}
