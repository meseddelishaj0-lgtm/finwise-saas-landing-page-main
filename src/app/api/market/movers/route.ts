import { NextRequest, NextResponse } from "next/server";
import { getMovers, getMostActive, type MoverMarket } from "@/lib/twelvedata";

export const dynamic = "force-dynamic";

// Gainers / losers / most-active, from Twelve Data's market_movers endpoint.
//
// Twelve Data has no "most active" list, so that view merges the gainer and
// loser lists and re-ranks them by dollar turnover. market_movers is billed at
// 100 credits per call, hence the 60s server-side cache.

let cache: Record<string, { data: unknown; ts: number }> = {};
const TTL = 60 * 1000;

const MARKETS = new Set<MoverMarket>(["stocks", "etf", "mutual_funds", "forex", "crypto"]);

export async function GET(req: NextRequest) {
  const list = req.nextUrl.searchParams.get("list") || "gainers";
  const marketParam = req.nextUrl.searchParams.get("market") || "stocks";
  const market = (MARKETS.has(marketParam as MoverMarket) ? marketParam : "stocks") as MoverMarket;

  const key = `${market}:${list}`;
  const hit = cache[key];
  if (hit && Date.now() - hit.ts < TTL) {
    return NextResponse.json(hit.data, {
      headers: { "Cache-Control": "public, max-age=30" },
    });
  }

  try {
    const rows =
      list === "actives"
        ? await getMostActive(12)
        : await getMovers(list === "losers" ? "losers" : "gainers", {
            market,
            outputsize: 20,
          });

    if (rows.length === 0) throw new Error("no movers");

    const slim = rows.slice(0, 12).map((q) => ({
      symbol: q.symbol,
      name: q.name,
      price: q.price,
      change: q.change,
      changePercent: q.changesPercentage,
    }));

    cache[key] = { data: slim, ts: Date.now() };
    return NextResponse.json(slim, {
      headers: { "Cache-Control": "public, max-age=30" },
    });
  } catch {
    if (hit) return NextResponse.json(hit.data);
    return NextResponse.json({ error: "Failed to load movers" }, { status: 502 });
  }
}
