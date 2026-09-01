"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORIES, NAME_OVERRIDES } from "@/components/market/catalog";

// Market heatmap — squarified treemap, tile area ∝ market cap, color =
// % change over the selected timeframe. All custom, no chart libraries.

interface Item {
  symbol: string;
  name: string;
  sector: string;
  value: number; // area weight (market cap)
  chg: number; // color driver (%)
  price: number;
}

interface Tile extends Item {
  x: number;
  y: number;
  w: number;
  h: number;
}

type Scope = "stocks" | "crypto" | "etfs";
type Timeframe = "1D" | "1W" | "1M" | "3M" | "6M" | "YTD" | "1Y";

const TF_FIELD: Record<Timeframe, string> = {
  "1D": "chg", "1W": "p1w", "1M": "p1m", "3M": "p3m", "6M": "p6m", YTD: "pytd", "1Y": "p1y",
};
// Color domain (± %) per timeframe — wider horizons move more
const TF_DOMAIN: Record<Timeframe, number> = {
  "1D": 3, "1W": 6, "1M": 12, "3M": 20, "6M": 30, YTD: 35, "1Y": 50,
};

const NEG: [number, number, number] = [214, 69, 69];
const MID: [number, number, number] = [42, 40, 34];
const POS: [number, number, number] = [34, 166, 91];

const colorFor = (chg: number, domain: number): string => {
  const t = Math.max(-1, Math.min(1, chg / domain));
  const from = t < 0 ? NEG : POS;
  const k = Math.abs(t);
  const mix = (a: number, b: number) => Math.round(a + (b - a) * k);
  return `rgb(${mix(MID[0], from[0])},${mix(MID[1], from[1])},${mix(MID[2], from[2])})`;
};

const fmtCap = (v: number) => {
  if (v >= 1e12) return `${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
  return `${Math.round(v)}`;
};

// ---- Squarified treemap (Bruls et al.) ----
function squarify(items: Item[], x: number, y: number, w: number, h: number): Tile[] {
  const tiles: Tile[] = [];
  const total = items.reduce((s, it) => s + it.value, 0);
  if (total <= 0 || w <= 0 || h <= 0) return tiles;
  const scale = (w * h) / total;
  let rest = items.map((it) => ({ ...it, area: it.value * scale }));
  let cx = x, cy = y, cw = w, ch = h;

  const worst = (row: { area: number }[], side: number) => {
    const sum = row.reduce((s, r) => s + r.area, 0);
    let max = 0, min = Infinity;
    for (const r of row) {
      if (r.area > max) max = r.area;
      if (r.area < min) min = r.area;
    }
    const s2 = sum * sum;
    return Math.max((side * side * max) / s2, s2 / (side * side * min));
  };

  while (rest.length) {
    const side = Math.min(cw, ch);
    const row: typeof rest = [rest[0]];
    let i = 1;
    while (i < rest.length) {
      const cand = [...row, rest[i]];
      if (worst(cand, side) <= worst(row, side)) {
        row.push(rest[i]);
        i++;
      } else break;
    }
    rest = rest.slice(row.length);
    const rowArea = row.reduce((s, r) => s + r.area, 0);
    if (cw >= ch) {
      // vertical strip on the left
      const stripW = rowArea / ch;
      let ty = cy;
      for (const r of row) {
        const th = r.area / stripW;
        tiles.push({ ...r, x: cx, y: ty, w: stripW, h: th });
        ty += th;
      }
      cx += stripW;
      cw -= stripW;
    } else {
      const stripH = rowArea / cw;
      let tx = cx;
      for (const r of row) {
        const tw = r.area / stripH;
        tiles.push({ ...r, x: tx, y: cy, w: tw, h: stripH });
        tx += tw;
      }
      cy += stripH;
      ch -= stripH;
    }
  }
  return tiles;
}

interface SectorBlock {
  sector: string;
  x: number;
  y: number;
  w: number;
  h: number;
  tiles: Tile[];
}

function HeatmapPage() {
  const router = useRouter();
  const [scope, setScope] = useState<Scope>("stocks");
  const [tf, setTf] = useState<Timeframe>("1D");
  const [topN, setTopN] = useState(150);
  const [grouped, setGrouped] = useState(true);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [quoteItems, setQuoteItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [size, setSize] = useState({ w: 1200, h: 720 });
  const [tip, setTip] = useState<{ x: number; y: number; item: Item } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // Stocks dataset (screener API — has all timeframes)
  useEffect(() => {
    if (scope !== "stocks") return;
    let alive = true;
    setLoading(rows.length === 0);
    fetch("/api/market/screener")
      .then((r) => r.json())
      .then((d) => { if (alive && Array.isArray(d?.rows)) setRows(d.rows); })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  // Crypto / ETF datasets (quotes API — 1D only)
  useEffect(() => {
    if (scope === "stocks") return;
    let alive = true;
    setLoading(true);
    setTf("1D");
    const list = CATEGORIES.find((c) => c.key === (scope === "crypto" ? "crypto" : "etfs"))!.symbols;
    fetch(`/api/market/quotes?symbols=${encodeURIComponent(list.join(","))}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive || !Array.isArray(d)) return;
        setQuoteItems(
          d.map((q: Record<string, unknown>) => ({
            symbol: String(q.symbol),
            name: NAME_OVERRIDES[String(q.symbol)] || String(q.name || q.symbol),
            sector: scope === "crypto" ? "Crypto" : "ETFs",
            value: Number(q.marketCap) || Number(q.price) * (Number(q.volume) || 1) || 1,
            chg: Number(q.changePercent) || 0,
            price: Number(q.price) || 0,
          }))
        );
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [scope]);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setSize({ w: r.width, h: Math.max(420, Math.min(860, window.innerHeight - 300)) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const items: Item[] = useMemo(() => {
    if (scope !== "stocks") return [...quoteItems].sort((a, b) => b.value - a.value);
    const field = TF_FIELD[tf];
    return rows
      .slice(0, topN)
      .map((r) => ({
        symbol: String(r.symbol),
        name: String(r.name),
        sector: String(r.sector),
        value: Number(r.mcap) || 1,
        chg: Number(r[field]) || 0,
        price: Number(r.price) || 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [rows, quoteItems, scope, tf, topN]);

  const domain = TF_DOMAIN[tf];

  const blocks: SectorBlock[] = useMemo(() => {
    const W = size.w, H = size.h;
    if (!items.length) return [];
    if (!grouped || scope !== "stocks") {
      return [{ sector: "", x: 0, y: 0, w: W, h: H, tiles: squarify(items, 0, 0, W, H) }];
    }
    // Group by sector, treemap the sectors, then the members inside
    const bySector = new Map<string, Item[]>();
    for (const it of items) {
      const list = bySector.get(it.sector) || [];
      list.push(it);
      bySector.set(it.sector, list);
    }
    const sectorItems: Item[] = Array.from(bySector.entries())
      .map(([sector, list]) => ({
        symbol: sector,
        name: sector,
        sector,
        value: list.reduce((s, it) => s + it.value, 0),
        chg: 0,
        price: 0,
      }))
      .sort((a, b) => b.value - a.value);
    const sectorTiles = squarify(sectorItems, 0, 0, W, H);
    return sectorTiles.map((st) => {
      const members = (bySector.get(st.sector) || []).sort((a, b) => b.value - a.value);
      const header = st.h > 52 && st.w > 70 ? 17 : 0;
      return {
        sector: st.sector,
        x: st.x,
        y: st.y,
        w: st.w,
        h: st.h,
        tiles: squarify(members, st.x + 1, st.y + header + 1, Math.max(st.w - 2, 1), Math.max(st.h - header - 2, 1)),
      };
    });
  }, [items, size, grouped, scope]);

  return (
    <main className="min-h-screen bg-night text-white pt-6 pb-10 px-4 md:px-6">
      <div className="max-w-[1600px] mx-auto">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-yellow-500/20 bg-surface px-4 py-3 mb-4">
          <h1 className="font-bold text-lg mr-2">
            <span className="bg-gradient-to-r from-yellow-400 to-amber-300 bg-clip-text text-transparent">Market Heatmap</span>
          </h1>

          <div className="flex gap-1">
            {([["stocks", "Stocks"], ["crypto", "Crypto"], ["etfs", "ETFs"]] as [Scope, string][]).map(([key, label]) => (
              <button key={key} onClick={() => setScope(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  scope === key ? "bg-yellow-400/15 text-yellow-300 border border-yellow-400/30" : "text-gray-500 hover:text-gray-300 border border-white/10"
                }`}>
                {label}
              </button>
            ))}
          </div>

          {scope === "stocks" && (
            <>
              <div className="flex gap-0.5">
                {(Object.keys(TF_FIELD) as Timeframe[]).map((t) => (
                  <button key={t} onClick={() => setTf(t)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
                      tf === t ? "bg-yellow-400/15 text-yellow-300 border border-yellow-400/30" : "text-gray-500 hover:text-gray-200 border border-transparent"
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
              <select value={topN} onChange={(e) => setTopN(Number(e.target.value))}
                aria-label="Number of stocks"
                className="bg-white/[0.04] border border-white/10 rounded-lg px-2 py-1.5 text-xs font-semibold text-gray-300 outline-none cursor-pointer [&>option]:bg-[#161410]">
                {[100, 150, 250, 500].map((n) => (
                  <option key={n} value={n}>Top {n}</option>
                ))}
              </select>
              <button onClick={() => setGrouped((g) => !g)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  grouped ? "bg-yellow-400/15 text-yellow-300 border-yellow-400/30" : "text-gray-500 border-white/10 hover:text-gray-300"
                }`}>
                Sectors
              </button>
            </>
          )}

          {/* Legend */}
          <div className="ml-auto flex items-center gap-1.5">
            <span className="font-mono text-[10px] text-red-400">−{domain}%</span>
            <div className="w-28 h-2.5 rounded-full" style={{
              background: `linear-gradient(to right, rgb(${NEG.join(",")}), rgb(${MID.join(",")}), rgb(${POS.join(",")}))`,
            }} />
            <span className="font-mono text-[10px] text-green-400">+{domain}%</span>
          </div>

          <Link href="/screener" className="text-yellow-400 hover:text-yellow-300 text-xs font-bold transition-colors">
            Open Screener →
          </Link>
        </div>

        {/* Treemap */}
        <div ref={boxRef} className="relative rounded-2xl border border-white/10 bg-surface overflow-hidden" style={{ height: size.h }}
          onMouseLeave={() => setTip(null)}>
          {loading && items.length === 0 ? (
            <div className="absolute inset-3 rounded-xl bg-white/[0.03] animate-pulse" />
          ) : (
            blocks.map((block) => (
              <React.Fragment key={block.sector || "all"}>
                {block.sector && block.h > 52 && block.w > 70 && (
                  <span
                    className="absolute z-10 px-1.5 truncate font-mono text-[10px] font-bold uppercase tracking-wider text-gray-400 pointer-events-none"
                    style={{ left: block.x + 2, top: block.y + 2, maxWidth: block.w - 6 }}>
                    {block.sector}
                  </span>
                )}
                {block.tiles.map((t) => {
                  const showPct = t.w > 46 && t.h > 34;
                  const showSym = t.w > 30 && t.h > 15;
                  const fs = Math.max(9, Math.min(20, Math.sqrt(t.w * t.h) / 7));
                  return (
                    <button
                      key={t.symbol}
                      onClick={() => router.push(`/terminal?symbol=${encodeURIComponent(t.symbol)}`)}
                      onMouseMove={(e) => setTip({ x: e.clientX, y: e.clientY, item: t })}
                      className="absolute flex flex-col items-center justify-center overflow-hidden transition-[filter] hover:brightness-125 hover:z-20"
                      style={{
                        left: t.x, top: t.y, width: t.w, height: t.h,
                        background: colorFor(t.chg, domain),
                        boxShadow: "inset 0 0 0 1px #0D0C09",
                      }}>
                      {showSym && (
                        <span className="font-mono font-bold text-white leading-none" style={{ fontSize: fs }}>
                          {t.symbol.replace("USD", "")}
                        </span>
                      )}
                      {showPct && (
                        <span className="font-mono text-white/85 leading-tight" style={{ fontSize: Math.max(8, fs * 0.62) }}>
                          {t.chg >= 0 ? "+" : ""}{t.chg.toFixed(2)}%
                        </span>
                      )}
                    </button>
                  );
                })}
              </React.Fragment>
            ))
          )}
        </div>

        {/* Tooltip */}
        {tip && (
          <div className="fixed z-50 pointer-events-none rounded-lg border border-yellow-400/25 bg-black/95 backdrop-blur px-3 py-2"
            style={{ left: Math.min(tip.x + 14, size.w - 180), top: tip.y + 14 }}>
            <p className="font-mono font-bold text-sm">{tip.item.symbol.replace("USD", "")}
              <span className={`ml-2 text-xs font-bold ${tip.item.chg >= 0 ? "text-green-400" : "text-red-400"}`}>
                {tip.item.chg >= 0 ? "+" : ""}{tip.item.chg.toFixed(2)}%
              </span>
            </p>
            <p className="text-[11px] text-gray-400 max-w-[200px] truncate">{tip.item.name}</p>
            <p className="font-mono text-[11px] text-gray-300 mt-0.5">
              ${tip.item.price >= 1000 ? tip.item.price.toLocaleString(undefined, { maximumFractionDigits: 0 }) : tip.item.price.toFixed(2)}
              <span className="text-gray-600"> · {fmtCap(tip.item.value)}</span>
            </p>
          </div>
        )}

        <p className="text-center text-[11px] text-gray-600 mt-4">
          Tile size = market cap · color = {scope === "stocks" ? tf : "1D"} change · click a tile to open it in the Terminal
        </p>
      </div>
    </main>
  );
}

export default HeatmapPage;
