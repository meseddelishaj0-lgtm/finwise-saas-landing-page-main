// app/api/global/route.ts
import { NextResponse } from "next/server";
import { getQuotes } from "@/lib/twelvedata";

export const dynamic = "force-dynamic";

// Global market snapshot.
//
// Twelve Data's Pro plan does not sell index symbols, so each market is
// represented by the most liquid ETF tracking it. The `name` is the market,
// the `symbol` is the instrument actually quoted, so nothing on the page
// claims to be an index level that is not one.
const MARKETS: { symbol: string; name: string; region: string }[] = [
  { symbol: "SPY", name: "S&P 500 (US Large Cap)", region: "Americas" },
  { symbol: "QQQ", name: "Nasdaq 100 (US Tech)", region: "Americas" },
  { symbol: "DIA", name: "Dow Jones Industrials", region: "Americas" },
  { symbol: "IWM", name: "Russell 2000 (US Small Cap)", region: "Americas" },
  { symbol: "MDY", name: "S&P MidCap 400", region: "Americas" },
  { symbol: "EWC", name: "Canada", region: "Americas" },
  { symbol: "EWW", name: "Mexico", region: "Americas" },
  { symbol: "EWZ", name: "Brazil", region: "Americas" },
  { symbol: "VGK", name: "Europe", region: "EMEA" },
  { symbol: "EWU", name: "United Kingdom", region: "EMEA" },
  { symbol: "EWG", name: "Germany", region: "EMEA" },
  { symbol: "EWQ", name: "France", region: "EMEA" },
  { symbol: "EWI", name: "Italy", region: "EMEA" },
  { symbol: "EWL", name: "Switzerland", region: "EMEA" },
  { symbol: "EWD", name: "Sweden", region: "EMEA" },
  { symbol: "EZA", name: "South Africa", region: "EMEA" },
  { symbol: "EWJ", name: "Japan", region: "Asia Pacific" },
  { symbol: "MCHI", name: "China", region: "Asia Pacific" },
  { symbol: "INDA", name: "India", region: "Asia Pacific" },
  { symbol: "EWY", name: "South Korea", region: "Asia Pacific" },
  { symbol: "EWT", name: "Taiwan", region: "Asia Pacific" },
  { symbol: "EWA", name: "Australia", region: "Asia Pacific" },
  { symbol: "EWH", name: "Hong Kong", region: "Asia Pacific" },
  { symbol: "EWS", name: "Singapore", region: "Asia Pacific" },
  { symbol: "EEM", name: "Emerging Markets", region: "Global" },
  { symbol: "EFA", name: "Developed ex-US", region: "Global" },
  { symbol: "ACWI", name: "All Country World", region: "Global" },
];

export async function GET() {
  try {
    const quotes = await getQuotes(
      MARKETS.map((m) => m.symbol),
      { ttl: 60_000 }
    );
    if (quotes.length === 0) throw new Error("no quotes");

    const meta = new Map(MARKETS.map((m) => [m.symbol, m]));
    const data = quotes.map((q) => {
      const m = meta.get(q.symbol);
      return {
        symbol: q.symbol,
        name: m?.name || q.name,
        region: m?.region || "",
        price: q.price,
        change: q.change,
        changesPercentage: q.changesPercentage,
        dayLow: q.dayLow,
        dayHigh: q.dayHigh,
        yearLow: q.yearLow,
        yearHigh: q.yearHigh,
        open: q.open,
        previousClose: q.previousClose,
        volume: q.volume,
        avgVolume: q.avgVolume,
        exchange: q.exchange,
        timestamp: q.timestamp,
      };
    });

    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    });
  } catch (error) {
    console.error("Error fetching global market data:", error);
    return NextResponse.json(
      { error: "Failed to load global market data" },
      { status: 500 }
    );
  }
}
