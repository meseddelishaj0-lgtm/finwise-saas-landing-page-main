"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Stock screener — 100+ filters over the /api/market/screener dataset
// (top 1500 US stocks). All filtering/sorting is client-side and instant.

interface Row {
  symbol: string; name: string; sector: string; industry: string; exchange: string;
  price: number; chg: number; mcap: number; vol: number; avgVol: number;
  relVol: number | null; dollarVol: number; pe: number | null; eps: number | null;
  beta: number | null; divYield: number | null; yearHigh: number | null; yearLow: number | null;
  fromHigh: number | null; fromLow: number | null; vs50: number | null; vs200: number | null;
  gap: number | null; dayPos: number | null;
  p1w: number | null; p1m: number | null; p3m: number | null; p6m: number | null;
  pytd: number | null; p1y: number | null; p3y: number | null; p5y: number | null;
}

type NumKey =
  | "price" | "chg" | "mcapB" | "vol" | "avgVol" | "relVol" | "dollarVolM"
  | "pe" | "eps" | "divYield" | "beta"
  | "fromHigh" | "fromLow" | "vs50" | "vs200" | "gap" | "dayPos"
  | "p1w" | "p1m" | "p3m" | "p6m" | "pytd" | "p1y" | "p3y" | "p5y";

interface MetricDef { key: NumKey; label: string; group: string; unit?: string }

const METRICS: MetricDef[] = [
  { key: "price", label: "Price", group: "Market Data", unit: "$" },
  { key: "chg", label: "Change 1D", group: "Market Data", unit: "%" },
  { key: "mcapB", label: "Market Cap", group: "Market Data", unit: "$B" },
  { key: "vol", label: "Volume", group: "Market Data" },
  { key: "avgVol", label: "Avg Volume (3M)", group: "Market Data" },
  { key: "relVol", label: "Relative Volume", group: "Market Data", unit: "×" },
  { key: "dollarVolM", label: "Dollar Volume", group: "Market Data", unit: "$M" },
  { key: "gap", label: "Gap (Open vs Prev)", group: "Market Data", unit: "%" },
  { key: "pe", label: "P/E (TTM)", group: "Valuation" },
  { key: "eps", label: "EPS (TTM)", group: "Valuation", unit: "$" },
  { key: "divYield", label: "Dividend Yield", group: "Valuation", unit: "%" },
  { key: "beta", label: "Beta", group: "Technicals" },
  { key: "fromHigh", label: "% From 52W High", group: "Technicals", unit: "%" },
  { key: "fromLow", label: "% Above 52W Low", group: "Technicals", unit: "%" },
  { key: "vs50", label: "% vs 50D MA", group: "Technicals", unit: "%" },
  { key: "vs200", label: "% vs 200D MA", group: "Technicals", unit: "%" },
  { key: "dayPos", label: "Day Range Position", group: "Technicals", unit: "%" },
  { key: "p1w", label: "Perf 1 Week", group: "Performance", unit: "%" },
  { key: "p1m", label: "Perf 1 Month", group: "Performance", unit: "%" },
  { key: "p3m", label: "Perf 3 Months", group: "Performance", unit: "%" },
  { key: "p6m", label: "Perf 6 Months", group: "Performance", unit: "%" },
  { key: "pytd", label: "Perf YTD", group: "Performance", unit: "%" },
  { key: "p1y", label: "Perf 1 Year", group: "Performance", unit: "%" },
  { key: "p3y", label: "Perf 3 Years", group: "Performance", unit: "%" },
  { key: "p5y", label: "Perf 5 Years", group: "Performance", unit: "%" },
];

const SECTORS = [
  "Technology", "Financial Services", "Healthcare", "Consumer Cyclical", "Industrials",
  "Communication Services", "Consumer Defensive", "Energy", "Utilities", "Basic Materials", "Real Estate",
];
const EXCHANGES = ["NASDAQ", "NYSE", "AMEX"];
const CAP_CLASSES = [
  { key: "mega", label: "Mega ≥ $200B", min: 200e9, max: Infinity },
  { key: "large", label: "Large $10–200B", min: 10e9, max: 200e9 },
  { key: "mid", label: "Mid $2–10B", min: 2e9, max: 10e9 },
  { key: "small", label: "Small < $2B", min: 0, max: 2e9 },
];

type Tri = "any" | "above" | "below";

interface Filters {
  sectors: Set<string>;
  exchanges: Set<string>;
  caps: Set<string>;
  industry: string;
  ranges: Partial<Record<NumKey, { min?: number; max?: number }>>;
  sma50: Tri;
  sma200: Tri;
  goldenCross: boolean;
  nearHigh: boolean;
  nearLow: boolean;
  divPayer: boolean;
  profitable: boolean;
  highRelVol: boolean;
  gapUp: boolean;
  gapDown: boolean;
}

const emptyFilters = (): Filters => ({
  sectors: new Set(), exchanges: new Set(), caps: new Set(), industry: "",
  ranges: {}, sma50: "any", sma200: "any",
  goldenCross: false, nearHigh: false, nearLow: false, divPayer: false,
  profitable: false, highRelVol: false, gapUp: false, gapDown: false,
});

const PRESETS: { name: string; icon: string; apply: (f: Filters) => void }[] = [
  { name: "Top Gainers", icon: "🚀", apply: (f) => { f.ranges.chg = { min: 3 }; f.ranges.dollarVolM = { min: 50 }; } },
  { name: "Top Losers", icon: "📉", apply: (f) => { f.ranges.chg = { max: -3 }; f.ranges.dollarVolM = { min: 50 }; } },
  { name: "Momentum", icon: "⚡", apply: (f) => { f.sma50 = "above"; f.sma200 = "above"; f.ranges.p1m = { min: 10 }; f.ranges.p6m = { min: 25 }; } },
  { name: "Value", icon: "💎", apply: (f) => { f.ranges.pe = { min: 0, max: 15 }; f.profitable = true; f.ranges.mcapB = { min: 2 }; } },
  { name: "Dividend Payers", icon: "💰", apply: (f) => { f.ranges.divYield = { min: 3 }; f.profitable = true; } },
  { name: "52W High Break", icon: "📈", apply: (f) => { f.nearHigh = true; f.sma200 = "above"; } },
  { name: "Oversold", icon: "🩹", apply: (f) => { f.ranges.fromHigh = { max: -30 }; f.ranges.mcapB = { min: 10 }; } },
  { name: "Unusual Volume", icon: "🔥", apply: (f) => { f.highRelVol = true; f.ranges.dollarVolM = { min: 25 }; } },
  { name: "Mega Caps", icon: "🏛️", apply: (f) => { f.caps = new Set(["mega"]); } },
  { name: "High Beta", icon: "🎢", apply: (f) => { f.ranges.beta = { min: 1.5 }; f.ranges.mcapB = { min: 2 }; } },
];

const COLUMN_VIEWS: Record<string, { key: string; label: string; num?: boolean }[]> = {
  Overview: [
    { key: "price", label: "Price", num: true }, { key: "chg", label: "1D %", num: true },
    { key: "mcap", label: "Mkt Cap", num: true }, { key: "vol", label: "Volume", num: true },
    { key: "relVol", label: "Rel Vol", num: true }, { key: "pe", label: "P/E", num: true },
    { key: "sector", label: "Sector" },
  ],
  Performance: [
    { key: "chg", label: "1D %", num: true }, { key: "p1w", label: "1W %", num: true },
    { key: "p1m", label: "1M %", num: true }, { key: "p3m", label: "3M %", num: true },
    { key: "p6m", label: "6M %", num: true }, { key: "pytd", label: "YTD %", num: true },
    { key: "p1y", label: "1Y %", num: true }, { key: "p5y", label: "5Y %", num: true },
  ],
  Valuation: [
    { key: "price", label: "Price", num: true }, { key: "mcap", label: "Mkt Cap", num: true },
    { key: "pe", label: "P/E", num: true }, { key: "eps", label: "EPS", num: true },
    { key: "divYield", label: "Div %", num: true }, { key: "beta", label: "Beta", num: true },
    { key: "sector", label: "Sector" },
  ],
  Technicals: [
    { key: "price", label: "Price", num: true }, { key: "vs50", label: "vs 50MA %", num: true },
    { key: "vs200", label: "vs 200MA %", num: true }, { key: "fromHigh", label: "52W High %", num: true },
    { key: "fromLow", label: "52W Low %", num: true }, { key: "relVol", label: "Rel Vol", num: true },
    { key: "gap", label: "Gap %", num: true }, { key: "dayPos", label: "Day Pos %", num: true },
  ],
};

const fmtCap = (v: number) => {
  if (v >= 1e12) return `${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
  return `${Math.round(v)}`;
};

const metricValue = (r: Row, key: NumKey): number | null => {
  switch (key) {
    case "mcapB": return r.mcap / 1e9;
    case "dollarVolM": return r.dollarVol / 1e6;
    default: return (r as unknown as Record<string, number | null>)[key];
  }
};

const PAGE_SIZE = 50;

function ScreenerPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(emptyFilters());
  const [view, setView] = useState<keyof typeof COLUMN_VIEWS>("Overview");
  const [sortKey, setSortKey] = useState<string>("mcap");
  const [sortDesc, setSortDesc] = useState(true);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/market/screener")
      .then((r) => r.json())
      .then((d) => { if (alive && Array.isArray(d?.rows)) setRows(d.rows); })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const update = (fn: (f: Filters) => void) => {
    setFilters((prev) => {
      const next: Filters = {
        ...prev,
        sectors: new Set(prev.sectors),
        exchanges: new Set(prev.exchanges),
        caps: new Set(prev.caps),
        ranges: { ...prev.ranges },
      };
      fn(next);
      return next;
    });
    setActivePreset(null);
    setPage(0);
  };

  const applyPreset = (name: string) => {
    if (activePreset === name) {
      setFilters(emptyFilters());
      setActivePreset(null);
      return;
    }
    const f = emptyFilters();
    PRESETS.find((p) => p.name === name)?.apply(f);
    setFilters(f);
    setActivePreset(name);
    setPage(0);
  };

  const activeCount = useMemo(() => {
    let c = filters.sectors.size + filters.exchanges.size + filters.caps.size;
    if (filters.industry.trim()) c++;
    for (const r of Object.values(filters.ranges)) {
      if (r?.min != null) c++;
      if (r?.max != null) c++;
    }
    if (filters.sma50 !== "any") c++;
    if (filters.sma200 !== "any") c++;
    for (const k of ["goldenCross", "nearHigh", "nearLow", "divPayer", "profitable", "highRelVol", "gapUp", "gapDown"] as const) {
      if (filters[k]) c++;
    }
    return c;
  }, [filters]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const ind = filters.industry.trim().toLowerCase();
    let out = rows.filter((r) => {
      if (s && !r.symbol.toLowerCase().includes(s) && !r.name.toLowerCase().includes(s)) return false;
      if (filters.sectors.size && !filters.sectors.has(r.sector)) return false;
      if (filters.exchanges.size && !filters.exchanges.has(r.exchange)) return false;
      if (filters.caps.size) {
        const ok = CAP_CLASSES.some((c) => filters.caps.has(c.key) && r.mcap >= c.min && r.mcap < c.max);
        if (!ok) return false;
      }
      if (ind && !r.industry.toLowerCase().includes(ind)) return false;
      for (const [key, range] of Object.entries(filters.ranges)) {
        if (!range) continue;
        const v = metricValue(r, key as NumKey);
        if (range.min != null && (v == null || v < range.min)) return false;
        if (range.max != null && (v == null || v > range.max)) return false;
      }
      if (filters.sma50 !== "any" && (r.vs50 == null || (filters.sma50 === "above" ? r.vs50 <= 0 : r.vs50 >= 0))) return false;
      if (filters.sma200 !== "any" && (r.vs200 == null || (filters.sma200 === "above" ? r.vs200 <= 0 : r.vs200 >= 0))) return false;
      if (filters.goldenCross && !(r.vs50 != null && r.vs200 != null && r.vs200 > r.vs50)) return false;
      if (filters.nearHigh && !(r.fromHigh != null && r.fromHigh >= -5)) return false;
      if (filters.nearLow && !(r.fromLow != null && r.fromLow <= 10)) return false;
      if (filters.divPayer && !(r.divYield != null && r.divYield > 0)) return false;
      if (filters.profitable && !(r.eps != null && r.eps > 0)) return false;
      if (filters.highRelVol && !(r.relVol != null && r.relVol >= 2)) return false;
      if (filters.gapUp && !(r.gap != null && r.gap >= 1)) return false;
      if (filters.gapDown && !(r.gap != null && r.gap <= -1)) return false;
      return true;
    });
    out = [...out].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortKey];
      const bv = (b as unknown as Record<string, unknown>)[sortKey];
      if (typeof av === "string" || typeof bv === "string") {
        return sortDesc ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
      }
      const an = av == null ? -Infinity : Number(av);
      const bn = bv == null ? -Infinity : Number(bv);
      return sortDesc ? bn - an : an - bn;
    });
    return out;
  }, [rows, filters, search, sortKey, sortDesc]);

  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const columns = COLUMN_VIEWS[view];

  const cell = (r: Row, key: string): React.ReactNode => {
    const raw = (r as unknown as Record<string, unknown>)[key];
    switch (key) {
      case "price": return `$${r.price >= 1000 ? r.price.toLocaleString(undefined, { maximumFractionDigits: 0 }) : r.price.toFixed(2)}`;
      case "mcap": return `$${fmtCap(r.mcap)}`;
      case "vol": return fmtCap(r.vol);
      case "relVol": return r.relVol != null ? `${r.relVol.toFixed(2)}×` : "—";
      case "pe": return r.pe != null && r.pe > 0 ? r.pe.toFixed(1) : "—";
      case "eps": return r.eps != null ? `$${r.eps.toFixed(2)}` : "—";
      case "beta": return r.beta != null ? r.beta.toFixed(2) : "—";
      case "sector": return <span className="text-gray-400 text-xs">{r.sector}</span>;
      case "divYield": return r.divYield != null && r.divYield > 0 ? `${r.divYield.toFixed(2)}%` : "—";
      case "dayPos": return r.dayPos != null ? `${r.dayPos.toFixed(0)}%` : "—";
      default: {
        const v = raw == null ? null : Number(raw);
        if (v == null || !Number.isFinite(v)) return "—";
        return (
          <span className={v >= 0 ? "text-green-400" : "text-red-400"}>
            {v >= 0 ? "+" : ""}{v.toFixed(2)}%
          </span>
        );
      }
    }
  };

  const RangeInput: React.FC<{ def: MetricDef }> = ({ def }) => {
    const range = filters.ranges[def.key] || {};
    const set = (part: "min" | "max", val: string) =>
      update((f) => {
        const cur = { ...(f.ranges[def.key] || {}) };
        if (val === "") delete cur[part];
        else cur[part] = Number(val);
        if (cur.min == null && cur.max == null) delete f.ranges[def.key];
        else f.ranges[def.key] = cur;
      });
    const active = range.min != null || range.max != null;
    return (
      <div className="flex items-center gap-1.5 py-1">
        <span className={`flex-1 text-[11px] ${active ? "text-yellow-300 font-semibold" : "text-gray-400"}`}>
          {def.label}{def.unit ? <span className="text-gray-600"> {def.unit}</span> : null}
        </span>
        <input type="number" placeholder="Min" defaultValue={range.min ?? ""} key={`${def.key}-min-${activePreset}`}
          onBlur={(e) => set("min", e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && set("min", (e.target as HTMLInputElement).value)}
          className="w-[62px] bg-white/[0.04] border border-white/10 rounded-md px-1.5 py-1 text-[11px] font-mono text-white outline-none focus:border-yellow-400/50 [appearance:textfield]" />
        <input type="number" placeholder="Max" defaultValue={range.max ?? ""} key={`${def.key}-max-${activePreset}`}
          onBlur={(e) => set("max", e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && set("max", (e.target as HTMLInputElement).value)}
          className="w-[62px] bg-white/[0.04] border border-white/10 rounded-md px-1.5 py-1 text-[11px] font-mono text-white outline-none focus:border-yellow-400/50 [appearance:textfield]" />
      </div>
    );
  };

  const Chip: React.FC<{ on: boolean; onClick: () => void; children: React.ReactNode }> = ({ on, onClick, children }) => (
    <button onClick={onClick}
      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
        on ? "bg-yellow-400/15 text-yellow-300 border-yellow-400/30" : "text-gray-500 border-white/10 hover:text-gray-300"
      }`}>
      {children}
    </button>
  );

  const groups = ["Market Data", "Performance", "Valuation", "Technicals"];

  return (
    <main className="min-h-screen bg-night text-white pt-6 pb-10 px-4 md:px-6">
      <div className="max-w-[1700px] mx-auto">
        {/* Header bar */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-yellow-500/20 bg-surface px-4 py-3 mb-4">
          <h1 className="font-bold text-lg">
            <span className="bg-gradient-to-r from-yellow-400 to-amber-300 bg-clip-text text-transparent">Stock Screener</span>
          </h1>
          <span className="font-mono text-xs text-gray-500">
            {loading ? "loading…" : `${filtered.length.toLocaleString()} / ${rows.length.toLocaleString()} stocks`}
          </span>
          <div className="flex items-center gap-1.5 flex-1 min-w-[160px] max-w-[240px] bg-white/[0.04] border border-white/10 rounded-lg px-2.5 py-1.5 focus-within:border-yellow-400/50 transition-colors">
            <span className="text-gray-600 text-xs">🔍</span>
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Ticker or name…"
              className="bg-transparent outline-none w-full text-xs text-white placeholder:text-gray-600" />
          </div>
          <button onClick={() => setSidebarOpen((o) => !o)}
            className={`lg:hidden px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
              sidebarOpen ? "bg-yellow-400/15 text-yellow-300 border-yellow-400/30" : "text-gray-400 border-white/10"
            }`}>
            ⚙ Filters {activeCount > 0 ? `(${activeCount})` : ""}
          </button>
          {activeCount > 0 && (
            <button onClick={() => { setFilters(emptyFilters()); setActivePreset(null); setPage(0); }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors">
              Reset all ({activeCount})
            </button>
          )}
          <Link href="/heatmap" className="ml-auto text-yellow-400 hover:text-yellow-300 text-xs font-bold transition-colors">
            Open Heatmap →
          </Link>
        </div>

        {/* Preset screens */}
        <div className="flex gap-1.5 overflow-x-auto pb-3 [scrollbar-width:none]">
          {PRESETS.map((p) => (
            <button key={p.name} onClick={() => applyPreset(p.name)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                activePreset === p.name
                  ? "bg-yellow-400 text-black border-yellow-400"
                  : "text-gray-400 border-white/10 hover:text-yellow-300 hover:border-yellow-400/40 bg-surface"
              }`}>
              {p.icon} {p.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[290px_1fr] gap-4">
          {/* Filter sidebar */}
          <aside className={`${sidebarOpen ? "block" : "hidden"} lg:block rounded-2xl border border-white/10 bg-surface overflow-hidden h-fit`}>
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <h2 className="font-bold text-sm">Filters</h2>
              <span className="font-mono text-[10px] text-gray-600">{activeCount} active</span>
            </div>
            <div className="p-3 space-y-1 max-h-[74vh] overflow-y-auto">
              {/* Universe */}
              <details open className="group">
                <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider text-gray-400 py-2 list-none flex justify-between items-center">
                  Universe <span className="text-gray-600 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="text-[10px] text-gray-600 mb-1">Market cap class</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {CAP_CLASSES.map((c) => (
                    <Chip key={c.key} on={filters.caps.has(c.key)}
                      onClick={() => update((f) => { if (f.caps.has(c.key)) f.caps.delete(c.key); else f.caps.add(c.key); })}>
                      {c.label}
                    </Chip>
                  ))}
                </div>
                <p className="text-[10px] text-gray-600 mb-1">Exchange</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {EXCHANGES.map((x) => (
                    <Chip key={x} on={filters.exchanges.has(x)}
                      onClick={() => update((f) => { if (f.exchanges.has(x)) f.exchanges.delete(x); else f.exchanges.add(x); })}>
                      {x}
                    </Chip>
                  ))}
                </div>
                <p className="text-[10px] text-gray-600 mb-1">Sector</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {SECTORS.map((sec) => (
                    <Chip key={sec} on={filters.sectors.has(sec)}
                      onClick={() => update((f) => { if (f.sectors.has(sec)) f.sectors.delete(sec); else f.sectors.add(sec); })}>
                      {sec}
                    </Chip>
                  ))}
                </div>
                <input value={filters.industry} onChange={(e) => update((f) => { f.industry = e.target.value; })}
                  placeholder="Industry contains… (e.g. Semiconductors)"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-white outline-none focus:border-yellow-400/50 mb-1" />
              </details>

              {/* Quick signals */}
              <details open className="group border-t border-white/5 pt-1">
                <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider text-gray-400 py-2 list-none flex justify-between items-center">
                  Signals <span className="text-gray-600 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <div className="space-y-2 mb-2">
                  {([["sma50", "50D MA"], ["sma200", "200D MA"]] as const).map(([key, label]) => (
                    <div key={key} className="flex items-center gap-1.5">
                      <span className="flex-1 text-[11px] text-gray-400">Price vs {label}</span>
                      {(["any", "above", "below"] as Tri[]).map((v) => (
                        <Chip key={v} on={filters[key] === v} onClick={() => update((f) => { f[key] = v; })}>
                          {v === "any" ? "Any" : v === "above" ? "Above" : "Below"}
                        </Chip>
                      ))}
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-1">
                    {([
                      ["nearHigh", "Near 52W High"], ["nearLow", "Near 52W Low"], ["goldenCross", "Golden Cross 50>200"],
                      ["profitable", "Profitable"], ["divPayer", "Pays Dividend"], ["highRelVol", "Rel Vol ≥ 2×"],
                      ["gapUp", "Gap Up ≥ 1%"], ["gapDown", "Gap Down ≤ −1%"],
                    ] as [keyof Filters, string][]).map(([key, label]) => (
                      <Chip key={key} on={Boolean(filters[key])} onClick={() => update((f) => { (f as unknown as Record<string, boolean>)[key as string] = !f[key]; })}>
                        {label}
                      </Chip>
                    ))}
                  </div>
                </div>
              </details>

              {/* Numeric groups */}
              {groups.map((g) => (
                <details key={g} open={g === "Market Data"} className="group border-t border-white/5 pt-1">
                  <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider text-gray-400 py-2 list-none flex justify-between items-center">
                    {g}
                    <span className="text-gray-600 group-open:rotate-180 transition-transform">▾</span>
                  </summary>
                  <div className="mb-2">
                    {METRICS.filter((m) => m.group === g).map((m) => (
                      <RangeInput key={m.key} def={m} />
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </aside>

          {/* Results table */}
          <div className="rounded-2xl border border-white/10 bg-surface overflow-hidden">
            <div className="flex gap-1 p-2 border-b border-white/5 overflow-x-auto [scrollbar-width:none]">
              {Object.keys(COLUMN_VIEWS).map((v) => (
                <button key={v} onClick={() => setView(v as keyof typeof COLUMN_VIEWS)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                    view === v ? "bg-yellow-400/15 text-yellow-300 border border-yellow-400/30" : "text-gray-500 hover:text-gray-300 border border-transparent"
                  }`}>
                  {v}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-[11px] uppercase tracking-wider">
                    <th className="px-4 py-2.5 text-left font-semibold sticky left-0 bg-surface cursor-pointer hover:text-gray-300"
                      onClick={() => { setSortKey("symbol"); setSortDesc(sortKey === "symbol" ? !sortDesc : false); }}>
                      Symbol {sortKey === "symbol" ? (sortDesc ? "↓" : "↑") : ""}
                    </th>
                    {columns.map((c) => (
                      <th key={c.key} onClick={() => { setSortKey(c.key); setSortDesc(sortKey === c.key ? !sortDesc : true); }}
                        className={`px-3 py-2.5 font-semibold cursor-pointer hover:text-gray-300 whitespace-nowrap ${c.num ? "text-right" : "text-left"}`}>
                        {c.label} {sortKey === c.key ? (sortDesc ? "↓" : "↑") : ""}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? [...Array(12)].map((_, i) => (
                        <tr key={i} className="border-t border-white/5">
                          <td colSpan={columns.length + 1} className="px-4 py-2.5">
                            <div className="h-6 rounded bg-white/[0.04] animate-pulse" />
                          </td>
                        </tr>
                      ))
                    : pageRows.map((r) => (
                        <tr key={r.symbol} onClick={() => router.push(`/terminal?symbol=${encodeURIComponent(r.symbol)}`)}
                          className="border-t border-white/5 hover:bg-white/[0.03] cursor-pointer transition-colors">
                          <td className="px-4 py-2.5 sticky left-0 bg-surface">
                            <span className="font-mono font-bold text-white">{r.symbol}</span>
                            <span className="block text-[10px] text-gray-600 truncate max-w-[160px]">{r.name}</span>
                          </td>
                          {columns.map((c) => (
                            <td key={c.key} className={`px-3 py-2.5 font-mono tabular-nums text-[13px] text-gray-200 whitespace-nowrap ${c.num ? "text-right" : "text-left"}`}>
                              {cell(r, c.key)}
                            </td>
                          ))}
                        </tr>
                      ))}
                  {!loading && pageRows.length === 0 && (
                    <tr>
                      <td colSpan={columns.length + 1} className="px-4 py-12 text-center text-gray-600 text-sm">
                        No stocks match these filters. <button onClick={() => { setFilters(emptyFilters()); setActivePreset(null); }} className="text-yellow-400 hover:underline">Reset all</button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pageCount > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
                <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 text-gray-400 hover:text-yellow-300 disabled:opacity-30 transition-colors">
                  ← Prev
                </button>
                <span className="font-mono text-xs text-gray-500">
                  Page {page + 1} / {pageCount}
                </span>
                <button disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 text-gray-400 hover:text-yellow-300 disabled:opacity-30 transition-colors">
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-[11px] text-gray-600 mt-4">
          Universe: top 1,500 US stocks by market cap (NYSE · NASDAQ · AMEX) · refreshed every 5 minutes · click a row to open the Terminal
        </p>
      </div>
    </main>
  );
}

export default ScreenerPage;
