import { NextRequest, NextResponse } from "next/server";
import { fmp } from "@/lib/fmp";

export const dynamic = "force-dynamic";

// Relative value (RV): the symbol and its FMP peer group side by side.
// Three FMP calls total — peers list, one batch quote, one batch profile —
// cached so flipping between tickers stays cheap.

const MIN = 60_000;

export async function GET(req: NextRequest) {
  const symbol = (req.nextUrl.searchParams.get("symbol") || "").toUpperCase().trim();
  if (!/^[A-Z0-9.-]{1,10}$/.test(symbol)) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  }

  const peersRaw = await fmp<{ peersList?: string[] }[]>("v4/stock_peers", { symbol }, 6 * 60 * MIN);
  const peers = (Array.isArray(peersRaw) ? peersRaw[0]?.peersList ?? [] : [])
    .filter((p) => /^[A-Z.-]{1,6}$/.test(p) && p !== symbol)
    .slice(0, 11);
  const all = [symbol, ...peers];
  const list = all.map(encodeURIComponent).join(",");

  const [quotes, profiles, ratios] = await Promise.all([
    fmp<Record<string, any>[]>(`v3/quote/${list}`, {}, MIN),
    fmp<Record<string, any>[]>(`v3/profile/${list}`, {}, 6 * 60 * MIN),
    fmp<Record<string, any>[]>(`v3/key-metrics-ttm/${encodeURIComponent(symbol)}`, {}, 60 * MIN),
  ]);

  const q = new Map((Array.isArray(quotes) ? quotes : []).map((r) => [String(r.symbol), r]));
  const p = new Map((Array.isArray(profiles) ? profiles : []).map((r) => [String(r.symbol), r]));
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

  const rows = all
    .filter((s) => q.has(s))
    .map((s) => {
      const qr = q.get(s)!;
      const pr = p.get(s) ?? {};
      const price = num(qr.price);
      const lastDiv = num(pr.lastDiv);
      return {
        symbol: s,
        name: String(pr.companyName ?? qr.name ?? s),
        sector: pr.sector ?? null,
        industry: pr.industry ?? null,
        price,
        changePercent: num(qr.changesPercentage),
        marketCap: num(qr.marketCap),
        pe: num(qr.pe),
        eps: num(qr.eps),
        beta: num(pr.beta),
        dividendYield: lastDiv != null && price ? (lastDiv / price) * 100 : null,
        yearLow: num(qr.yearLow),
        yearHigh: num(qr.yearHigh),
        priceAvg50: num(qr.priceAvg50),
        priceAvg200: num(qr.priceAvg200),
        avgVolume: num(qr.avgVolume),
        fromHigh: price && num(qr.yearHigh) ? ((price - qr.yearHigh) / qr.yearHigh) * 100 : null,
      };
    });

  return NextResponse.json(
    { symbol, rows, ttm: Array.isArray(ratios) ? ratios[0] ?? null : null },
    { headers: { "Cache-Control": "public, max-age=60" } }
  );
}
