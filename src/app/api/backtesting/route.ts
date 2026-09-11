import { NextResponse } from "next/server";
import { getTimeSeries } from "@/lib/twelvedata";

// Backtest comparison series.
//
// The benchmark is real: a year of daily SPY closes from Twelve Data, indexed to
// 100 at the start so it plots as a cumulative return.
//
// The strategy series is NOT real. It has always been a placeholder — the
// benchmark scaled by a constant — and this route keeps that behaviour rather
// than silently inventing something better. What changed is that the response
// now says so (`strategyIsPlaceholder`), so the page can label it instead of
// presenting a fabricated track record as a result. Wire a real strategy series
// in here when one exists.

export const dynamic = "force-dynamic";

const PLACEHOLDER_MULTIPLIER = 1.2;

interface BacktestResult {
  date: string;
  strategyReturn: number;
  benchmarkReturn: number;
}

export async function GET() {
  try {
    const bars = await getTimeSeries("SPY", "1day", 365, { ttl: 60 * 60_000 });
    if (bars.length < 2) throw new Error("insufficient benchmark history");

    // Both series are indexed to 100 at the first bar, so the page's
    // last/first ratio yields total return directly.
    const base = bars[0].c;
    const results: BacktestResult[] = bars.map((b) => {
      const growth = b.c / base; // 1.0 at the start
      return {
        date: b.t.slice(0, 10),
        benchmarkReturn: Number((growth * 100).toFixed(4)),
        strategyReturn: Number(
          (100 + (growth - 1) * 100 * PLACEHOLDER_MULTIPLIER).toFixed(4)
        ),
      };
    });

    return NextResponse.json(
      {
        benchmarkSymbol: "SPY",
        strategyIsPlaceholder: true,
        note:
          "The strategy line is illustrative only: it is the benchmark return " +
          `scaled by ${PLACEHOLDER_MULTIPLIER}, not a backtested result.`,
        results,
      },
      { headers: { "Cache-Control": "public, s-maxage=3600" } }
    );
  } catch (err) {
    console.error("Backtesting API Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch backtesting data" },
      { status: 502 }
    );
  }
}
