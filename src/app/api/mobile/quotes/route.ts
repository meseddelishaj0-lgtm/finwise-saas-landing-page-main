// api/mobile/quotes/route.ts
// Batch quotes endpoint for mobile app
// Reduces multiple API calls to one, with optional KV caching

import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge"; // Edge Runtime for faster global response
export const dynamic = "force-dynamic";

const FMP_API_KEY = process.env.FMP_API_KEY;

// Check if KV is configured
const KV_CONFIGURED = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

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

    // Fetch uncached quotes from FMP
    if (uncachedSymbols.length > 0) {
      const freshQuotes = await fetchQuotesFromFMP(uncachedSymbols);
      quotes.push(...freshQuotes);

      // Cache fresh quotes in KV if available (fire and forget)
      if (kv && freshQuotes.length > 0) {
        Promise.all(
          freshQuotes.map((quote) =>
            kv.set(`quote:${quote.symbol}`, quote, { ex: 30 }).catch(() => {})
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
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=10, stale-while-revalidate=30"
    );

    return response;
  } catch (error) {
    console.error("Batch quotes error:", error);

    // Fallback: try direct FMP fetch without any caching
    try {
      const { searchParams } = new URL(req.url);
      const symbolsParam = searchParams.get("symbols") || "";
      const symbols = symbolsParam.split(",").map(s => s.trim().toUpperCase()).filter(Boolean).slice(0, 50);
      const quotes = await fetchQuotesFromFMP(symbols);

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

    // Fetch all quotes from FMP (simpler approach for POST)
    const quotes = await fetchQuotesFromFMP(validSymbols);

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
