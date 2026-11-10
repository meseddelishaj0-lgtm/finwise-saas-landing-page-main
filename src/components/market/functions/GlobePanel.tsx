"use client";

// GLOBE — the world on one screen: where each commodity comes from and where it
// ships, the chokepoints it passes, and every index and currency at its home
// city. Markers take their colour from the live day move.

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { FnPanel, Pills, useJson, fetchBars, fmtP, fmtChg, fmtPctS, fmtBig, tone, isNum } from "./ui";
import { COMMODITIES, CHOKEPOINTS, INDEX_CITIES, FX_CITIES, CommodityGeo } from "./globeData";
import type { GlobeMarker, GlobeArc } from "./GlobeCanvas";

const GlobeCanvas = dynamic(() => import("./GlobeCanvas"), {
  ssr: false,
  loading: () => (
    <div className="h-full grid place-items-center text-[11px] font-mono uppercase tracking-widest text-gray-600">Loading globe…</div>
  ),
});

interface GQuote {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  dayLow: number | null;
  dayHigh: number | null;
  yearLow: number | null;
  yearHigh: number | null;
}

interface Cot {
  symbol: string;
  date: string;
  longPct: number | null;
  shortPct: number | null;
  situation: string;
  net: number | null;
  prevNet: number | null;
}

type Layer = "CMDTY" | "EQ" | "FX" | "SEA";
const LAYERS = [
  { key: "CMDTY", label: "Commodities" },
  { key: "EQ", label: "Indices" },
  { key: "FX", label: "Currencies" },
  { key: "SEA", label: "Chokepoints" },
];

const toneOf = (pct?: number | null): "up" | "down" | "flat" =>
  !isNum(pct) || Math.abs(pct) < 0.005 ? "flat" : pct > 0 ? "up" : "down";

/* ------------------------------ bits ------------------------------ */

const Spark: React.FC<{ symbol: string }> = ({ symbol }) => {
  const [pts, setPts] = useState<number[] | null>(null);
  useEffect(() => {
    let alive = true;
    setPts(null);
    fetchBars(symbol, "3M")
      .then((b) => alive && setPts(b.map((x: { c: number }) => x.c).filter(isNum)))
      .catch(() => alive && setPts([]));
    return () => {
      alive = false;
    };
  }, [symbol]);

  if (!pts) return <div className="h-16 rounded-lg bg-white/[0.04] animate-pulse" />;
  if (pts.length < 2) return null;
  const lo = Math.min(...pts);
  const hi = Math.max(...pts);
  const W = 280;
  const H = 64;
  const path = pts
    .map((v, i) => `${i ? "L" : "M"}${((i / (pts.length - 1)) * W).toFixed(1)},${(H - 4 - ((v - lo) / (hi - lo || 1)) * (H - 8)).toFixed(1)}`)
    .join("");
  const chg = (pts[pts.length - 1] / pts[0] - 1) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">3 months</span>
        <span className={`font-mono text-[11px] tabular-nums ${tone(chg)}`}>{fmtPctS(chg)}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16" preserveAspectRatio="none" role="img" aria-label={`Three month price, ${fmtPctS(chg)}`}>
        <path d={`${path}L${W},${H}L0,${H}Z`} fill="rgba(250,204,21,0.08)" />
        <path d={path} fill="none" stroke="#FACC15" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
};

const Range: React.FC<{ label: string; lo: number | null; hi: number | null; v: number | null }> = ({ label, lo, hi, v }) => {
  if (!isNum(lo) || !isNum(hi) || !isNum(v) || hi <= lo) return null;
  const pct = Math.min(100, Math.max(0, ((v - lo) / (hi - lo)) * 100));
  return (
    <div>
      <div className="flex justify-between text-[10px] font-mono tabular-nums text-gray-500">
        <span>{fmtP(lo)}</span>
        <span className="font-sans font-bold uppercase tracking-wider">{label}</span>
        <span>{fmtP(hi)}</span>
      </div>
      <div className="mt-1 h-1 rounded-full bg-white/10 relative">
        <span className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-yellow-300" style={{ left: `calc(${pct}% - 4px)` }} />
      </div>
    </div>
  );
};

const railRow = (active: boolean) =>
  `w-full flex items-center justify-between gap-3 px-3 py-2 text-left border-b border-white/5 transition-colors ${
    active ? "bg-yellow-400/10" : "hover:bg-white/[0.04]"
  }`;

/* ------------------------------ panel ------------------------------ */

const GlobePanel: React.FC<{ onSelect: (s: string) => void }> = ({ onSelect }) => {
  const [layer, setLayer] = useState<Layer>("CMDTY");
  const [sel, setSel] = useState<string | null>("BZUSD");
  const [hover, setHover] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ lat: number; lon: number; key: string } | null>(null);
  const [seen, setSeen] = useState<Record<string, boolean>>({ CMDTY: true });

  const fut = useJson<GQuote[]>("/api/market/global?view=futures", 30_000);
  const wei = useJson<GQuote[]>(seen.EQ ? "/api/market/global?view=wei" : null, 30_000);
  const fx = useJson<GQuote[]>(seen.FX ? "/api/market/global?view=fx" : null, 30_000);
  const cot = useJson<Cot[]>("/api/market/desk?view=cot");

  const quotes = useMemo(() => {
    const m = new Map<string, GQuote>();
    for (const list of [fut.data, wei.data, fx.data]) for (const q of Array.isArray(list) ? list : []) m.set(q.symbol, q);
    return m;
  }, [fut.data, wei.data, fx.data]);

  const pickLayer = (k: string) => {
    setLayer(k as Layer);
    setSeen((s) => ({ ...s, [k]: true }));
    setSel(null);
    setHover(null);
  };

  const flyTo = (lat: number, lon: number, key: string) => setFocus({ lat, lon, key: `${key}@${Date.now()}` });

  const selCommodity: CommodityGeo | undefined = layer === "CMDTY" ? COMMODITIES.find((c) => c.symbol === sel) : undefined;

  /** Strength of the non-USD currency against the dollar, in %. */
  const fxMove = (c: (typeof FX_CITIES)[number]) => {
    const p = quotes.get(c.symbol)?.changePercent;
    return isNum(p) ? (c.usdIsBase ? -p : p) : null;
  };

  /* ---- markers + arcs for the active layer ---- */
  const { markers, arcs, info } = useMemo(() => {
    const markers: GlobeMarker[] = [];
    const arcs: GlobeArc[] = [];
    // id → what the hover readout says
    const info = new Map<string, { title: string; sub: string; symbol?: string; note?: string }>();

    if (layer === "CMDTY") {
      for (const c of selCommodity ? [selCommodity] : COMMODITIES) {
        const q = quotes.get(c.symbol);
        c.sites.forEach((s, i) => {
          const id = `${c.symbol}:${i}`;
          markers.push({
            id, lat: s.lat, lon: s.lon,
            tone: toneOf(q?.changePercent),
            emphasis: !!selCommodity,
            label: selCommodity ? s.name : undefined,
            labelTone: "flat",
          });
          info.set(id, { title: s.name, sub: `${c.name} · ${s.country}`, symbol: c.symbol, note: s.note });
        });
      }
      if (selCommodity) {
        selCommodity.flows.forEach((f, i) => arcs.push({ id: `${selCommodity.symbol}:f${i}`, a: f.a, b: f.b }));
        CHOKEPOINTS.filter((k) => k.commodities.includes(selCommodity.symbol)).forEach((k) => {
          const id = `sea:${k.name}`;
          markers.push({ id, lat: k.lat, lon: k.lon, tone: "gold", shape: "diamond" });
          info.set(id, { title: k.name, sub: `Chokepoint · ${k.country}`, note: k.note });
        });
      }
    } else if (layer === "EQ") {
      for (const c of INDEX_CITIES) {
        const q = quotes.get(c.symbol);
        const t = toneOf(q?.changePercent);
        markers.push({
          id: c.symbol, lat: c.lat, lon: c.lon, tone: t, emphasis: sel === c.symbol,
          label: `${c.label} ${isNum(q?.changePercent) ? fmtPctS(q?.changePercent) : ""}`.trim(), labelTone: t,
        });
        info.set(c.symbol, { title: c.label, sub: c.city, symbol: c.symbol });
      }
    } else if (layer === "FX") {
      for (const c of FX_CITIES) {
        const mv = fxMove(c);
        const t = toneOf(mv);
        markers.push({
          id: c.symbol, lat: c.lat, lon: c.lon, tone: t, emphasis: sel === c.symbol,
          label: `${c.code} ${isNum(mv) ? fmtPctS(mv) : ""}`.trim(), labelTone: t,
        });
        info.set(c.symbol, { title: `${c.code} vs USD`, sub: c.city, symbol: c.symbol });
      }
    } else {
      for (const k of CHOKEPOINTS) {
        const id = `sea:${k.name}`;
        markers.push({ id, lat: k.lat, lon: k.lon, tone: "gold", shape: "diamond", emphasis: sel === id, label: k.name, labelTone: "gold" });
        info.set(id, { title: k.name, sub: `Chokepoint · ${k.country}`, note: k.note });
      }
      // Draw the oil routes these passages exist for.
      COMMODITIES.find((c) => c.symbol === "BZUSD")?.flows.forEach((f, i) => arcs.push({ id: `sea:f${i}`, a: f.a, b: f.b }));
    }
    return { markers, arcs, info };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layer, sel, selCommodity, quotes]);

  const onPick = (id: string) => {
    const m = markers.find((x) => x.id === id);
    if (m) flyTo(m.lat, m.lon, id);
    if (layer === "CMDTY") {
      if (!id.startsWith("sea:")) setSel(id.split(":")[0]);
    } else setSel(id);
  };

  const selectCommodity = (c: CommodityGeo) => {
    if (sel === c.symbol) {
      setSel(null);
      return;
    }
    setSel(c.symbol);
    // Centre on the producing sites.
    flyTo(c.sites[0].lat, c.sites[0].lon, c.symbol);
  };

  const hovered = hover ? info.get(hover) : null;
  const hq = hovered?.symbol ? quotes.get(hovered.symbol) : undefined;

  /* ---- detail card for the selection ---- */
  const detailSymbol =
    layer === "CMDTY" ? selCommodity?.symbol : layer === "SEA" ? undefined : sel && !sel.startsWith("sea:") ? sel : undefined;
  const dq = detailSymbol ? quotes.get(detailSymbol) : undefined;
  const dCot = selCommodity?.cot ? (Array.isArray(cot.data) ? cot.data : []).find((r) => r.symbol === selCommodity.cot) : undefined;
  const selChoke = layer === "SEA" && sel ? CHOKEPOINTS.find((k) => `sea:${k.name}` === sel) : undefined;
  const chartable = !!detailSymbol && detailSymbol !== "000001.SS";
  const detailTitle =
    selCommodity?.name ??
    INDEX_CITIES.find((c) => c.symbol === detailSymbol && layer === "EQ")?.label ??
    FX_CITIES.find((c) => c.symbol === detailSymbol)?.symbol.replace(/(...)(...)/, "$1/$2");

  const groups: CommodityGeo["group"][] = ["Energy", "Metals", "Grains", "Softs"];

  return (
    <FnPanel
      code="GLOBE"
      title="World Markets Globe"
      subtitle="Live moves by location · drag to rotate, pinch or +/− to zoom, click a marker"
      right={<div className="max-w-full overflow-x-auto"><Pills options={LAYERS} value={layer} onChange={pickLayer} /></div>}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px]">
        {/* Globe */}
        <div className="relative h-[420px] sm:h-[520px] lg:h-[640px] bg-[radial-gradient(ellipse_at_center,rgba(250,204,21,0.05),transparent_65%)]">
          <GlobeCanvas markers={markers} arcs={arcs} focus={focus} onPick={onPick} onHover={setHover} className="h-full" />

          {/* Hover readout */}
          <div className={`pointer-events-none absolute left-3 bottom-3 max-w-[78%] sm:max-w-xs rounded-xl border border-white/10 bg-night/85 backdrop-blur px-3 py-2.5 min-h-[58px] ${hovered ? "" : "hidden sm:block"}`}>
            {hovered ? (
              <>
                <p className="text-xs font-bold text-gray-100 leading-tight">{hovered.title}</p>
                <p className="text-[11px] text-gray-500">{hovered.sub}</p>
                {hq && (
                  <p className="mt-1 font-mono text-[11px] tabular-nums">
                    <span className="text-gray-200">{fmtP(hq.price)}</span>{" "}
                    <span className={tone(hq.changePercent)}>{fmtPctS(hq.changePercent)}</span>
                  </p>
                )}
                {hovered.note && <p className="mt-1 text-[11px] text-gray-400 leading-snug">{hovered.note}</p>}
              </>
            ) : (
              <>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Legend</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-400" />Up today</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400" />Down today</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rotate-45 bg-yellow-300" />Chokepoint</span>
                  <span className="flex items-center gap-1.5"><span className="w-4 h-px bg-yellow-300" />Export flow</span>
                </p>
              </>
            )}
          </div>
        </div>

        {/* Rail */}
        <div className="border-t lg:border-t-0 lg:border-l border-white/5 flex flex-col lg:h-[640px]">
          <div className="flex-1 overflow-y-auto max-h-[620px] lg:max-h-none">
          {/* Detail */}
          {(detailSymbol || selChoke) && (
            <div className="p-4 border-b border-white/5 space-y-3">
              {selChoke ? (
                <>
                  <div>
                    <p className="text-sm font-bold text-gray-100">{selChoke.name}</p>
                    <p className="text-[11px] text-gray-500">{selChoke.country}</p>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">{selChoke.note}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selChoke.commodities.map((s) => {
                      const c = COMMODITIES.find((x) => x.symbol === s);
                      const q = quotes.get(s);
                      return (
                        <button key={s} onClick={() => onSelect(s)} className="px-2 py-1 rounded-md border border-white/10 hover:border-yellow-400/40 text-[11px] font-mono">
                          <span className="text-gray-300">{c?.short ?? s}</span>{" "}
                          <span className={tone(q?.changePercent)}>{fmtPctS(q?.changePercent)}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-100 truncate">{detailTitle ?? detailSymbol}</p>
                      <p className="text-[11px] font-mono text-gray-500">
                        {detailSymbol?.replace("^", "")}
                        {selCommodity ? ` · ${selCommodity.unit}` : ""}
                      </p>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <p className="text-lg font-bold text-gray-100 leading-none">{fmtP(dq?.price)}</p>
                      <p className={`mt-1 text-[11px] ${tone(dq?.changePercent)}`}>
                        {fmtChg(dq?.change)} ({fmtPctS(dq?.changePercent)})
                      </p>
                    </div>
                  </div>
                  {chartable && <Spark symbol={detailSymbol!} />}
                  <Range label="Day" lo={dq?.dayLow ?? null} hi={dq?.dayHigh ?? null} v={dq?.price ?? null} />
                  <Range label="52W" lo={dq?.yearLow ?? null} hi={dq?.yearHigh ?? null} v={dq?.price ?? null} />
                  {dCot && isNum(dCot.longPct) && isNum(dCot.shortPct) && (
                    <div>
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-gray-500">
                        <span>Speculator positioning</span>
                        <span className="font-mono normal-case tracking-normal">{dCot.date}</span>
                      </div>
                      <div className="mt-1 flex h-1.5 rounded-full overflow-hidden bg-white/10">
                        <span className="bg-green-400/80" style={{ width: `${dCot.longPct}%` }} />
                        <span className="bg-red-400/80" style={{ width: `${dCot.shortPct}%` }} />
                      </div>
                      <p className="mt-1 flex justify-between font-mono text-[11px] tabular-nums text-gray-400">
                        <span>{dCot.longPct.toFixed(0)}% long</span>
                        <span>
                          net {fmtBig(dCot.net)}
                          {isNum(dCot.net) && isNum(dCot.prevNet) && (
                            <span className={tone(dCot.net - dCot.prevNet)}> ({fmtChg(dCot.net - dCot.prevNet, 0)} w/w)</span>
                          )}
                        </span>
                      </p>
                    </div>
                  )}
                  {selCommodity && selCommodity.flows.length > 0 && (
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      <span className="font-bold uppercase tracking-wider text-[10px]">Flows </span>
                      {selCommodity.flows.map((f) => `${f.from} → ${f.to}`).join(" · ")}
                    </p>
                  )}
                  {chartable && (
                    <button onClick={() => onSelect(detailSymbol!)} className="w-full px-3 py-2 rounded-lg bg-yellow-400 text-black text-xs font-black tracking-wide hover:bg-yellow-300 transition-colors">
                      Load {detailSymbol!.replace("^", "")} in chart
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* List for the layer */}
          <div>
            {layer === "CMDTY" &&
              groups.map((g) => (
                <div key={g}>
                  <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-yellow-300 bg-white/[0.02] border-b border-white/5">{g}</p>
                  {COMMODITIES.filter((c) => c.group === g).map((c) => {
                    const q = quotes.get(c.symbol);
                    return (
                      <button key={c.symbol} onClick={() => selectCommodity(c)} className={railRow(sel === c.symbol)} aria-pressed={sel === c.symbol}>
                        <span className="min-w-0">
                          <span className="block text-xs font-semibold text-gray-100 truncate">{c.name}</span>
                          <span className="block text-[10px] font-mono text-gray-600">{c.sites.length} sites · {c.unit}</span>
                        </span>
                        <span className="text-right font-mono tabular-nums text-xs whitespace-nowrap">
                          <span className="block text-gray-100">{fmtP(q?.price)}</span>
                          <span className={`block text-[11px] ${tone(q?.changePercent)}`}>{fmtPctS(q?.changePercent)}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}

            {layer === "EQ" &&
              INDEX_CITIES.map((c) => {
                const q = quotes.get(c.symbol);
                return (
                  <button key={c.symbol} onClick={() => { setSel(c.symbol); flyTo(c.lat, c.lon, c.symbol); }} className={railRow(sel === c.symbol)}>
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-gray-100 truncate">{c.label}</span>
                      <span className="block text-[10px] text-gray-600">{c.city}</span>
                    </span>
                    <span className="text-right font-mono tabular-nums text-xs whitespace-nowrap">
                      <span className="block text-gray-100">{fmtP(q?.price)}</span>
                      <span className={`block text-[11px] ${tone(q?.changePercent)}`}>{fmtPctS(q?.changePercent)}</span>
                    </span>
                  </button>
                );
              })}

            {layer === "FX" &&
              FX_CITIES.map((c) => {
                const q = quotes.get(c.symbol);
                const mv = fxMove(c);
                return (
                  <button key={c.symbol} onClick={() => { setSel(c.symbol); flyTo(c.lat, c.lon, c.symbol); }} className={railRow(sel === c.symbol)}>
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-gray-100">{c.code} <span className="font-normal text-gray-500">vs USD</span></span>
                      <span className="block text-[10px] font-mono text-gray-600">{c.symbol.replace(/(...)(...)/, "$1/$2")} · {c.city}</span>
                    </span>
                    <span className="text-right font-mono tabular-nums text-xs whitespace-nowrap">
                      <span className="block text-gray-100">{fmtP(q?.price, 4)}</span>
                      <span className={`block text-[11px] ${tone(mv)}`}>{fmtPctS(mv)}</span>
                    </span>
                  </button>
                );
              })}

            {layer === "SEA" &&
              CHOKEPOINTS.map((k) => {
                const id = `sea:${k.name}`;
                return (
                  <button key={id} onClick={() => { setSel(id); flyTo(k.lat, k.lon, id); }} className={railRow(sel === id)}>
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-gray-100">{k.name}</span>
                      <span className="block text-[11px] text-gray-500 leading-snug">{k.note}</span>
                    </span>
                  </button>
                );
              })}
          </div>

          </div>

          <p className="px-3 py-2 border-t border-white/5 text-[10px] text-gray-600 leading-snug">
            {layer === "FX"
              ? "Colour shows each currency's move against the US dollar today."
              : layer === "SEA"
              ? "Passages that concentrate seaborne energy and grain trade. Arcs show the main crude routes."
              : layer === "EQ"
              ? "Index levels at their home exchange. Closed markets show the last session."
              : "Major producing regions and pricing hubs, coloured by the front-month future's move today. Arcs are stylised export flows, not vessel tracks."}
          </p>
        </div>
      </div>
    </FnPanel>
  );
};

export default GlobePanel;
