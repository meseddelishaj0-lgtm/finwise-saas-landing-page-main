import { NextResponse } from "next/server";
import { getSectorPerformance, getQuotes } from "@/lib/twelvedata";

export const dynamic = "force-dynamic";

// Sector performance.
//
// FMP had /v3/stock/sectors-performance; Twelve Data has no equivalent, so the
// figures are the day's move in the 11 SPDR sector ETFs (see SECTOR_ETFS in
// @/lib/twelvedata). The `etf` field is carried through so the UI can say what
// is actually being quoted rather than implying a whole-sector aggregate.
//
// `breadth` is a plainly-labelled market-breadth proxy, NOT the CNN Fear &
// Greed Index (which has no data source here). It is the share of sector ETFs
// trading up on the day, nudged by the day's move in VIXY: rising short-term
// volatility futures pull the score down. Callers must present it as a proxy.

let cache: { data: unknown; ts: number } | null = null;
const TTL = 60 * 1000;

export async function GET() {
  if (cache && Date.now() - cache.ts < TTL) {
    return NextResponse.json(cache.data, {
      headers: { "Cache-Control": "public, max-age=30" },
    });
  }

  try {
    const [sectors, vix] = await Promise.all([
      getSectorPerformance(),
      getQuotes(["VIXY"], { ttl: 60_000 }),
    ]);
    if (sectors.length === 0) throw new Error("no sector data");

    const scored = sectors.filter((s) => Number.isFinite(s.changesPercentage) && s.price > 0);
    const vixChange = vix[0]?.changesPercentage ?? null;

    // Share of sectors up on the day, 0-100.
    const advancing = scored.filter((s) => s.changesPercentage > 0).length;
    const advanceShare = scored.length > 0 ? (advancing / scored.length) * 100 : null;

    // VIXY's daily move, clamped to +/-20% and mapped onto a +/-20 point tilt.
    const volTilt =
      vixChange === null ? 0 : -Math.max(-20, Math.min(20, vixChange));

    const breadth =
      advanceShare === null
        ? null
        : Math.round(Math.max(0, Math.min(100, advanceShare + volTilt)));

    const data = {
      sectors: scored.map((s) => ({
        sector: s.sector,
        etf: s.etf,
        price: s.price,
        changesPercentage: s.changesPercentage,
        changePercent: s.changesPercentage,
      })),
      breadth: {
        score: breadth,
        advancing,
        total: scored.length,
        vixyChangePercent: vixChange,
        label:
          "Market breadth proxy: share of the 11 SPDR sector ETFs up on the day, tilted by VIXY's move. Not the CNN Fear & Greed Index.",
      },
    };

    cache = { data, ts: Date.now() };
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=30" },
    });
  } catch {
    if (cache) return NextResponse.json(cache.data);
    return NextResponse.json({ error: "Failed to load sector data" }, { status: 502 });
  }
}
