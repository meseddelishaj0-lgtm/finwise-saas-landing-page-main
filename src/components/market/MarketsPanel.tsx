"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useQuotes, fmtPrice, Quote } from "./useQuotes";
import { CATEGORIES, NAME_OVERRIDES } from "./catalog";

// Left panel of the terminal: Watchlist + Markets browser with asset
// classes (stocks/ETFs/indices/crypto/forex/commodities/bonds), movers,
// sorting, and quick filtering.

type SortKey = "chgDesc" | "chgAsc" | "priceDesc" | "priceAsc" | "name";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "chgDesc", label: "▲ % Change" },
  { key: "chgAsc", label: "▼ % Change" },
  { key: "priceDesc", label: "Price ↓" },
  { key: "priceAsc", label: "Price ↑" },
  { key: "name", label: "A–Z" },
];

interface Mover {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
}

interface Props {
  activeSymbol: string;
  watchlist: string[];
  onSelect: (symbol: string) => void;
  onToggleWatch: (symbol: string) => void;
}

const MarketsPanel: React.FC<Props> = ({ activeSymbol, watchlist, onSelect, onToggleWatch }) => {
  const [tab, setTab] = useState<"watchlist" | "markets">("watchlist");
  const [category, setCategory] = useState(CATEGORIES[0].key);
  const [moverList, setMoverList] = useState<"" | "gainers" | "losers" | "actives">("");
  const [sort, setSort] = useState<SortKey>("chgDesc");
  const [filter, setFilter] = useState("");
  const [movers, setMovers] = useState<Mover[]>([]);

  const cat = CATEGORIES.find((c) => c.key === category) || CATEGORIES[0];
  const symbols = tab === "watchlist" ? watchlist : moverList ? [] : cat.symbols;
  const { quotes } = useQuotes(symbols, 30000);

  // Movers (gainers/losers/actives) come from their own endpoint
  useEffect(() => {
    if (!moverList) return;
    let alive = true;
    setMovers([]);
    fetch(`/api/market/movers?list=${moverList}`)
      .then((r) => r.json())
      .then((d) => { if (alive && Array.isArray(d)) setMovers(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, [moverList]);

  const rows: (Quote | Mover)[] = useMemo(() => {
    let list: (Quote | Mover)[] = moverList && tab === "markets" ? movers : quotes;
    const f = filter.trim().toLowerCase();
    if (f) {
      list = list.filter(
        (r) =>
          r.symbol.toLowerCase().includes(f) ||
          (NAME_OVERRIDES[r.symbol] || r.name || "").toLowerCase().includes(f)
      );
    }
    const sorted = [...list];
    switch (sort) {
      case "chgDesc":
        sorted.sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0));
        break;
      case "chgAsc":
        sorted.sort((a, b) => (a.changePercent || 0) - (b.changePercent || 0));
        break;
      case "priceDesc":
        sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case "priceAsc":
        sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case "name":
        sorted.sort((a, b) => a.symbol.localeCompare(b.symbol));
        break;
    }
    return sorted;
  }, [quotes, movers, moverList, tab, filter, sort]);

  const showSkeleton =
    (tab === "watchlist" && watchlist.length > 0 && quotes.length === 0) ||
    (tab === "markets" && !moverList && quotes.length === 0) ||
    (tab === "markets" && !!moverList && movers.length === 0);

  return (
    <div className="rounded-2xl border border-white/10 bg-surface overflow-hidden flex flex-col">
      {/* Watchlist | Markets tabs */}
      <div className="flex gap-1 p-2 border-b border-white/5">
        {([["watchlist", "★ Watchlist"], ["markets", "🌐 Markets"]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
              tab === key ? "bg-yellow-400/15 text-yellow-300" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Category chips (Markets tab) */}
      {tab === "markets" && (
        <>
          <div className="flex gap-1.5 px-2 pt-2 pb-1 overflow-x-auto [scrollbar-width:none]">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => { setCategory(c.key); setMoverList(""); }}
                className={`flex-shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors border ${
                  category === c.key && !moverList
                    ? "bg-yellow-400/15 text-yellow-300 border-yellow-400/30"
                    : "text-gray-500 hover:text-gray-300 border-white/10"
                }`}
              >
                {c.icon} {c.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 px-2 pb-1 overflow-x-auto [scrollbar-width:none]">
            {([["gainers", "🚀 Gainers"], ["losers", "📉 Losers"], ["actives", "🔥 Most Active"]] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setMoverList(moverList === key ? "" : key)}
                className={`flex-shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors border ${
                  moverList === key
                    ? "bg-yellow-400/15 text-yellow-300 border-yellow-400/30"
                    : "text-gray-500 hover:text-gray-300 border-white/10"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Filter + sort row */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-white/5">
        <div className="flex items-center gap-1.5 flex-1 min-w-0 bg-white/[0.04] border border-white/10 rounded-lg px-2 py-1.5 focus-within:border-yellow-400/50 transition-colors">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 text-gray-600">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2.5" />
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter…"
            aria-label="Filter list"
            className="bg-transparent outline-none w-full text-xs text-white placeholder:text-gray-600"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="Sort list"
          className="bg-white/[0.04] border border-white/10 rounded-lg px-1.5 py-1.5 text-[11px] font-semibold text-gray-300 outline-none focus:border-yellow-400/50 cursor-pointer [&>option]:bg-[#161410]"
        >
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Rows */}
      <div className="p-1.5 overflow-y-auto flex-1" style={{ maxHeight: "62vh" }}>
        {tab === "watchlist" && watchlist.length === 0 ? (
          <p className="text-center text-gray-600 text-xs py-8 px-4">
            Your watchlist is empty. Browse Markets and tap ★ to add symbols.
          </p>
        ) : showSkeleton ? (
          [...Array(8)].map((_, i) => (
            <div key={i} className="h-[52px] m-1 rounded-lg bg-white/[0.03] animate-pulse" />
          ))
        ) : rows.length === 0 ? (
          <p className="text-center text-gray-600 text-xs py-8">No matches for “{filter}”.</p>
        ) : (
          rows.map((r) => {
            const up = (r.changePercent || 0) >= 0;
            const active = r.symbol === activeSymbol;
            const watched = watchlist.includes(r.symbol);
            return (
              <div
                key={r.symbol}
                className={`group flex items-center rounded-lg transition-colors ${
                  active ? "bg-yellow-400/10 border border-yellow-400/25" : "hover:bg-white/[0.04] border border-transparent"
                }`}
              >
                <button onClick={() => onSelect(r.symbol)} className="flex-1 flex items-center justify-between min-w-0 px-2.5 py-2.5 text-left">
                  <div className="min-w-0 mr-2">
                    <span className={`font-mono font-bold text-sm ${active ? "text-yellow-300" : "text-white"}`}>
                      {r.symbol.replace("^", "")}
                    </span>
                    <span className="block text-[10px] text-gray-600 truncate max-w-[110px]">
                      {NAME_OVERRIDES[r.symbol] || r.name || ""}
                    </span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="block font-mono text-[13px] tabular-nums text-gray-200">
                      {r.price != null ? `$${fmtPrice(r.price)}` : "—"}
                    </span>
                    <span className={`font-mono text-[11px] font-bold tabular-nums ${up ? "text-green-400" : "text-red-400"}`}>
                      {up ? "+" : ""}{(r.changePercent || 0).toFixed(2)}%
                    </span>
                  </div>
                </button>
                <button
                  onClick={() => onToggleWatch(r.symbol)}
                  aria-label={watched ? `Remove ${r.symbol} from watchlist` : `Add ${r.symbol} to watchlist`}
                  className={`pr-2.5 pl-1 py-2.5 text-sm transition-colors ${
                    watched ? "text-yellow-400" : "text-gray-700 opacity-0 group-hover:opacity-100 hover:text-yellow-300"
                  }`}
                >
                  {watched ? "★" : "☆"}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MarketsPanel;
