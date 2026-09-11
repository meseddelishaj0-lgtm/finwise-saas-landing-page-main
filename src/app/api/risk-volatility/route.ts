import { NextResponse } from "next/server";
import { getTimeSeries } from "@/lib/twelvedata";

export const dynamic = "force-dynamic";

// Risk and volatility series for the last ~90 sessions.
//
// Data source is Twelve Data. The index itself is not sold on this plan, so the
// market series is SPY and the volatility series is VIXY (short-term VIX
// futures). Both are stated in the response so the page can label them.
//
// Two measures replaced earlier approximations:
//   drawdown      running peak-to-date, the standard definition, instead of a
//                 forward-looking maximum.
//   valueAtRisk   historical 95% VaR — the 5th percentile of the trailing
//                 return distribution — instead of scaling a single day's
//                 return by 1.65, which is not a VaR.

const WINDOW = 90;
/** Trailing sample used for each day's VaR estimate. */
const VAR_LOOKBACK = 60;

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export async function GET() {
  try {
    // Extra history so the first rendered day already has a full VaR sample.
    const need = WINDOW + VAR_LOOKBACK + 5;
    const [market, vol] = await Promise.all([
      getTimeSeries("SPY", "1day", need, { ttl: 10 * 60_000 }),
      getTimeSeries("VIXY", "1day", need, { ttl: 10 * 60_000 }),
    ]);

    if (market.length < 10) throw new Error("insufficient market history");

    const volByDate = new Map(vol.map((b) => [b.t.slice(0, 10), b.c]));

    // Daily returns, aligned to the bar that closes them.
    const returns: (number | null)[] = market.map((b, i) =>
      i === 0 || market[i - 1].c === 0 ? null : (b.c - market[i - 1].c) / market[i - 1].c
    );

    let peak = market[0].c;
    const rows = market.map((bar, i) => {
      peak = Math.max(peak, bar.c);
      const drawdown = peak > 0 ? ((bar.c - peak) / peak) * 100 : 0;

      const sample = returns
        .slice(Math.max(0, i - VAR_LOOKBACK + 1), i + 1)
        .filter((r): r is number => r !== null)
        .sort((a, b) => a - b);
      const var95 = percentile(sample, 0.05);

      return {
        date: bar.t.slice(0, 10),
        close: bar.c,
        dailyReturn: returns[i] === null ? null : Number((returns[i]! * 100).toFixed(4)),
        volatilityIndex: volByDate.get(bar.t.slice(0, 10)) ?? null,
        valueAtRisk: var95 === null ? null : Number((var95 * 100).toFixed(4)),
        drawdown: Number(drawdown.toFixed(4)),
      };
    });

    // Return only the requested window, oldest first.
    const results = rows.slice(-WINDOW);

    return NextResponse.json(results, {
      headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200" },
    });
  } catch (err) {
    console.error("Risk & Volatility API Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch risk and volatility data" },
      { status: 502 }
    );
  }
}
