import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Gainers / losers / most-active proxy (FMP), cached 60s server-side.
const LISTS: Record<string, string> = {
  gainers: "stock_market/gainers",
  losers: "stock_market/losers",
  actives: "stock_market/actives",
};

let cache: Record<string, { data: any; ts: number }> = {};
const TTL = 60 * 1000;

export async function GET(req: NextRequest) {
  const list = req.nextUrl.searchParams.get("list") || "gainers";
  const path = LISTS[list] || LISTS.gainers;

  const hit = cache[path];
  if (hit && Date.now() - hit.ts < TTL) {
    return NextResponse.json(hit.data, {
      headers: { "Cache-Control": "public, max-age=30" },
    });
  }

  try {
    const res = await fetch(
      `https://financialmodelingprep.com/api/v3/${path}?apikey=${process.env.FMP_API_KEY}`,
      { cache: "no-store" }
    );
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("bad upstream");

    const slim = data.slice(0, 12).map((q: any) => ({
      symbol: q.symbol,
      name: q.name,
      price: q.price,
      change: q.change,
      changePercent: q.changesPercentage,
    }));

    cache[path] = { data: slim, ts: Date.now() };
    return NextResponse.json(slim, {
      headers: { "Cache-Control": "public, max-age=30" },
    });
  } catch {
    return NextResponse.json({ error: "Failed to load movers" }, { status: 502 });
  }
}
