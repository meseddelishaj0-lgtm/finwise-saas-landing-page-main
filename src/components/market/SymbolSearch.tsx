"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Global symbol search with debounced autocomplete. Navigates to
// /terminal?symbol=X on select. Used in the header and the terminal.

interface Result {
  symbol: string;
  name: string;
  exchange: string;
  type: "stock" | "etf" | "index" | "crypto";
}

const TYPE_BADGE: Record<Result["type"], { label: string; cls: string }> = {
  stock: { label: "Stock", cls: "text-blue-300 bg-blue-400/10" },
  etf: { label: "ETF", cls: "text-purple-300 bg-purple-400/10" },
  index: { label: "Index", cls: "text-yellow-300 bg-yellow-400/10" },
  crypto: { label: "Crypto", cls: "text-orange-300 bg-orange-400/10" },
};

interface Props {
  variant?: "header" | "terminal";
  autoFocus?: boolean;
  onNavigate?: () => void;
}

const SymbolSearch: React.FC<Props> = ({ variant = "header", autoFocus, onNavigate }) => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [searching, setSearching] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(() => {
      fetch(`/api/market/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => {
          if (Array.isArray(d)) {
            setResults(d);
            setActive(0);
            setOpen(true);
          }
        })
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 220);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const go = useCallback(
    (symbol: string) => {
      setOpen(false);
      setQuery("");
      setResults([]);
      onNavigate?.();
      router.push(`/terminal?symbol=${encodeURIComponent(symbol)}`);
    },
    [router, onNavigate]
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[active]) go(results[active].symbol);
      else if (query.trim()) go(query.trim().toUpperCase().replace(/[^A-Z0-9^./-]/g, ""));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const isHeader = variant === "header";

  return (
    <div ref={wrapRef} className={`relative ${isHeader ? "w-full max-w-[260px]" : "w-full max-w-sm"}`}>
      <div
        className={`flex items-center gap-2 rounded-xl border transition-colors bg-white/[0.05] border-white/10 focus-within:border-yellow-400/60 focus-within:bg-white/[0.07] ${
          isHeader ? "px-3 py-1.5" : "px-3 py-2"
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 text-gray-500">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          autoFocus={autoFocus}
          placeholder="Search stocks, crypto, ETFs…"
          aria-label="Search symbols"
          className={`bg-transparent outline-none w-full text-white placeholder:text-gray-500 ${
            isHeader ? "text-sm" : "text-sm"
          }`}
        />
        {searching && (
          <span className="w-3.5 h-3.5 flex-shrink-0 rounded-full border-2 border-yellow-400/30 border-t-yellow-400 animate-spin" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-2 z-[70] rounded-xl border border-yellow-500/20 bg-[#0e0e0c] shadow-[0_20px_50px_rgba(0,0,0,0.7)] overflow-hidden min-w-[300px]">
          {results.map((r, i) => {
            const badge = TYPE_BADGE[r.type] || TYPE_BADGE.stock;
            return (
              <button
                key={r.symbol}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(r.symbol)}
                onMouseEnter={() => setActive(i)}
                className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors ${
                  i === active ? "bg-yellow-400/10" : ""
                }`}
              >
                <div className="min-w-0">
                  <span className={`font-mono font-bold text-sm ${i === active ? "text-yellow-300" : "text-white"}`}>
                    {r.symbol.replace("^", "")}
                  </span>
                  <span className="block text-[11px] text-gray-500 truncate">{r.name}</span>
                </div>
                <span className={`flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-bold ${badge.cls}`}>
                  {badge.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SymbolSearch;
