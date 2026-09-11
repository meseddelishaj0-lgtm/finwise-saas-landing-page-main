import { NextResponse } from "next/server";
import { getQuotes } from "@/lib/twelvedata";
import { fmp } from "@/lib/fmp";

export const dynamic = "force-dynamic";

// Most-traded US ETFs: live prices from Twelve Data, trailing returns from
// FMP's batch price-change endpoint (one call for the whole board).
//
// Twelve Data's /etfs catalog lists ~81,000 funds worldwide with no pricing and
// no ordering, and its /etfs/world family is Ultra-plan only, so the board is a
// curated set of the most liquid US listings.

const BOARD = [
  "SPY", "IVV", "VOO", "QQQ", "VTI", "IWM", "DIA", "EFA", "VEA", "IEMG",
  "EEM", "AGG", "BND", "LQD", "HYG", "TLT", "IEF", "GLD", "SLV", "XLK",
  "XLF", "XLE", "XLV", "XLY", "XLI", "SMH", "ARKK", "VNQ", "VIG", "SCHD",
];

const pct = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

export async function GET() {
  try {
    const [quotes, changes] = await Promise.all([
      getQuotes(BOARD, { ttl: 60_000 }),
      fmp<Record<string, unknown>[]>(`v3/stock-price-change/${BOARD.join(",")}`, {}, 15 * 60_000),
    ]);
    if (quotes.length === 0) throw new Error("no ETF quotes");

    const returns = new Map(
      (Array.isArray(changes) ? changes : []).map((c) => [String(c.symbol), c])
    );

    const etfs = quotes.map((q) => {
      const r = returns.get(q.symbol);
      return {
        symbol: q.symbol,
        name: q.name,
        price: q.price,
        change: q.change,
        changesPercentage: q.changesPercentage,
        volume: q.volume,
        avgVolume: q.avgVolume,
        yearHigh: q.yearHigh,
        yearLow: q.yearLow,
        // Percent returns, e.g. 11.13 = +11.13%.
        fiftyTwoWeekChange: pct(r?.["1Y"]),
        ytdReturn: pct(r?.ytd),
        threeMonthReturn: pct(r?.["3M"]),
      };
    });

    return NextResponse.json(etfs, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    });
  } catch (error) {
    console.error("ETF route error:", error);
    return NextResponse.json({ error: "Failed to fetch ETF data" }, { status: 502 });
  }
}
