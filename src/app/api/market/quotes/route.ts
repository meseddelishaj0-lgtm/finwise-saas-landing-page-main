import { NextRequest, NextResponse } from "next/server";
import { getQuotes } from "@/lib/twelvedata";
import { getQuoteStats, type QuoteStats } from "@/lib/fmp";

export const dynamic = "force-dynamic";

// Batch quote endpoint for the website's live market components.
// Prices come from Twelve Data; market cap and P/E come from one FMP batch
// quote, since Twelve Data only sells them via /statistics at 50 credits per
// symbol. Keys stay server-side and the response shape is unchanged.

let cache: Record<string, { data: unknown; ts: number }> = {};
const TTL = 30 * 1000;

export async function GET(req: NextRequest) {
  const symbols = (req.nextUrl.searchParams.get("symbols") || "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => /^[A-Z0-9^./-]{1,12}$/.test(s))
    .slice(0, 30);

  if (symbols.length === 0) {
    return NextResponse.json({ error: "symbols required" }, { status: 400 });
  }

  const key = symbols.join(",");
  const hit = cache[key];
  if (hit && Date.now() - hit.ts < TTL) {
    return NextResponse.json(hit.data, {
      headers: { "Cache-Control": "public, max-age=15" },
    });
  }

  try {
    const quotes = await getQuotes(symbols);
    if (quotes.length === 0) throw new Error("no quotes");

    // Valuation fields are best-effort: a missing one must not fail the batch.
    const stats = await getQuoteStats(quotes.map((q) => q.symbol)).catch(
      () => ({}) as Record<string, QuoteStats>
    );

    const slim = quotes.map((q) => {
      const s = stats[q.symbol.toUpperCase()];
      return {
        symbol: q.symbol,
        name: q.name,
        price: q.price,
        change: q.change,
        changePercent: q.changesPercentage,
        dayHigh: q.dayHigh,
        dayLow: q.dayLow,
        yearHigh: q.yearHigh ?? null,
        yearLow: q.yearLow ?? null,
        marketCap: s?.marketCap ?? null,
        volume: q.volume,
        pe: s?.pe ?? null,
        previousClose: q.previousClose,
      };
    });

    if (Object.keys(cache).length > 50) cache = {};
    cache[key] = { data: slim, ts: Date.now() };

    return NextResponse.json(slim, {
      headers: { "Cache-Control": "public, max-age=15" },
    });
  } catch {
    if (hit) return NextResponse.json(hit.data);
    return NextResponse.json({ error: "Failed to load quotes" }, { status: 502 });
  }
}
