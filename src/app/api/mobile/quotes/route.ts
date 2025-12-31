// api/mobile/quotes/route.ts
// Batch quotes endpoint with Vercel KV caching for mobile app
// Reduces multiple API calls to one, with 30-second cache per symbol

import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const runtime = "edge"; // Edge Runtime for faster global response
export const dynamic = "force-dynamic";

const FMP_API_KEY = process.env.FMP_API_KEY;
const CACHE_TTL = 30; // Cache quotes for 30 seconds

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
  priceAvg50: number;
  priceAvg200: number;
  volume: number;
  avgVolume: number;
  exchange: string;
  open: number;
  previousClose: number;
  eps: number;
  pe: number;
  sharesOutstanding: number;
  timestamp: number;
}

// Fetch quotes from FMP API
async function fetchQuotesFromFMP(symbols: string[]): Promise<Quote[]> {
  if (symbols.length === 0) return [];

  const symbolsParam = symbols.join(",");
  const url = `https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(
    symbolsParam
  )}?apikey=${FMP_API_KEY}`;

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

    // Check KV cache for each symbol
    const cacheKeys = symbols.map((s) => `quote:${s}`);
    const cachedResults: (Quote | null)[] = await Promise.all(
      cacheKeys.map((key) => kv.get<Quote>(key).catch(() => null))
    );

    // Separate cached and uncached symbols
    const quotes: Quote[] = [];
    const uncachedSymbols: string[] = [];

    symbols.forEach((symbol, index) => {
      const cached = cachedResults[index];
      if (cached) {
        quotes.push(cached);
      } else {
        uncachedSymbols.push(symbol);
      }
    });

    // Fetch uncached quotes from FMP
    if (uncachedSymbols.length > 0) {
      const freshQuotes = await fetchQuotesFromFMP(uncachedSymbols);

      // Cache fresh quotes in KV (fire and forget for speed)
      const cachePromises = freshQuotes.map((quote) =>
        kv.set(`quote:${quote.symbol}`, quote, { ex: CACHE_TTL }).catch((err) => {
          console.warn(`Failed to cache ${quote.symbol}:`, err);
        })
      );

      // Don't await cache writes to avoid blocking response
      Promise.all(cachePromises);

      quotes.push(...freshQuotes);
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
      cachedCount: symbols.length - uncachedSymbols.length,
      freshCount: uncachedSymbols.length,
      timestamp: Date.now(),
    });

    // Add cache headers for Vercel Edge Network
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=10, stale-while-revalidate=30"
    );

    return response;
  } catch (error) {
    console.error("Batch quotes error:", error);
    return NextResponse.json(
      { error: "Failed to fetch quotes", quotes: [] },
      { status: 500 }
    );
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

    // Check KV cache
    const cacheKeys = validSymbols.map((s) => `quote:${s}`);
    const cachedResults: (Quote | null)[] = await Promise.all(
      cacheKeys.map((key) => kv.get<Quote>(key).catch(() => null))
    );

    const quotes: Quote[] = [];
    const uncachedSymbols: string[] = [];

    validSymbols.forEach((symbol, index) => {
      const cached = cachedResults[index];
      if (cached) {
        quotes.push(cached);
      } else {
        uncachedSymbols.push(symbol);
      }
    });

    // Fetch uncached quotes
    if (uncachedSymbols.length > 0) {
      const freshQuotes = await fetchQuotesFromFMP(uncachedSymbols);

      // Cache in background
      freshQuotes.forEach((quote) => {
        kv.set(`quote:${quote.symbol}`, quote, { ex: CACHE_TTL }).catch(() => {});
      });

      quotes.push(...freshQuotes);
    }

    // Sort to match request order
    const symbolOrder = new Map(validSymbols.map((s, i) => [s, i]));
    quotes.sort((a, b) => {
      const orderA = symbolOrder.get(a.symbol) ?? 999;
      const orderB = symbolOrder.get(b.symbol) ?? 999;
      return orderA - orderB;
    });

    return NextResponse.json({
      quotes,
      cached: uncachedSymbols.length === 0,
      cachedCount: validSymbols.length - uncachedSymbols.length,
      freshCount: uncachedSymbols.length,
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
