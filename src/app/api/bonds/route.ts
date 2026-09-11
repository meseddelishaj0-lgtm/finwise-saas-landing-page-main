import { NextResponse } from "next/server";
import { getQuotes } from "@/lib/twelvedata";
import { fmp } from "@/lib/fmp";

export const dynamic = "force-dynamic";

// Treasury data.
//
// `treasuryRates` is FMP's daily Treasury par-yield curve, newest first, with
// yields in percent (month1 … year30). `ladder` is the Treasury ETF at each
// point on the curve, priced live on Twelve Data, for the pages that chart
// fund prices and turnover rather than yields.

const LADDER: { symbol: string; bucket: string; maturity: string }[] = [
  { symbol: "BIL", bucket: "1-3 months", maturity: "T-Bills" },
  { symbol: "SHV", bucket: "Under 1 year", maturity: "Short Bills" },
  { symbol: "SHY", bucket: "1-3 years", maturity: "Short Notes" },
  { symbol: "IEI", bucket: "3-7 years", maturity: "Intermediate Notes" },
  { symbol: "IEF", bucket: "7-10 years", maturity: "10 Year Notes" },
  { symbol: "TLH", bucket: "10-20 years", maturity: "Long Notes" },
  { symbol: "TLT", bucket: "20+ years", maturity: "Long Bonds" },
];

export async function GET() {
  try {
    const [rates, quotes] = await Promise.all([
      fmp<Record<string, unknown>[]>("v4/treasury", {}, 60 * 60_000),
      getQuotes(
        LADDER.map((l) => l.symbol),
        { ttl: 60_000 }
      ),
    ]);
    const treasuryRates = Array.isArray(rates) ? rates : [];
    const by = new Map(quotes.map((q) => [q.symbol, q]));

    const ladder = LADDER.map((l) => {
      const q = by.get(l.symbol);
      return {
        symbol: l.symbol,
        bucket: l.bucket,
        maturity: l.maturity,
        name: q?.name ?? l.symbol,
        price: q?.price ?? null,
        change: q?.change ?? null,
        changesPercentage: q?.changesPercentage ?? null,
        volume: q?.volume ?? null,
      };
    });

    return NextResponse.json({
      treasuryRates,
      curveAvailable: treasuryRates.length > 0,
      note:
        "The ladder shows prices and daily moves for the Treasury ETFs at each " +
        "point on the curve, not yields.",
      ladder,
      lastUpdated: new Date().toISOString(),
    }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    });
  } catch (error) {
    console.error("Error fetching Treasury data:", error);
    return NextResponse.json(
      {
        treasuryRates: [],
        curveAvailable: false,
        note: "Treasury data is unavailable right now.",
        ladder: [],
        error: error instanceof Error ? error.message : "request failed",
      },
      { status: 502 }
    );
  }
}
