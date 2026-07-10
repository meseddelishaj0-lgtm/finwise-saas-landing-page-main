import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Batch quote proxy for the website's live market components.
// Keeps the FMP key server-side; short cache smooths bursts of traffic.
let cache: Record<string, { data: any; ts: number }> = {};
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
    const res = await fetch(
      `https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(key)}?apikey=${process.env.FMP_API_KEY}`,
      { cache: "no-store" }
    );
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("bad upstream");

    const slim = data.map((q: any) => ({
      symbol: q.symbol,
      name: q.name,
      price: q.price,
      change: q.change,
      changePercent: q.changesPercentage,
      dayHigh: q.dayHigh,
      dayLow: q.dayLow,
      yearHigh: q.yearHigh,
      yearLow: q.yearLow,
      marketCap: q.marketCap,
      volume: q.volume,
      pe: q.pe,
      previousClose: q.previousClose,
    }));

    // Keep the tiny in-memory cache from growing unbounded
    if (Object.keys(cache).length > 50) cache = {};
    cache[key] = { data: slim, ts: Date.now() };

    return NextResponse.json(slim, {
      headers: { "Cache-Control": "public, max-age=15" },
    });
  } catch {
    return NextResponse.json({ error: "Failed to load quotes" }, { status: 502 });
  }
}
