"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CommandLine from "@/components/ui/CommandLine";
import Reveal from "@/components/ui/Reveal";

// Market research & valuation — the /api/market/screener universe (top 1500
// US-listed names by market cap, NYSE/Nasdaq/AMEX only). Search, sector
// filter and sorting are client-side; every row opens the symbol in /terminal.

interface Row {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  exchange: string;
  price: number;
  chg: number;
  mcap: number;
  vol: number;
  avgVol: number;
  relVol: number | null;
  pe: number | null;
  eps: number | null;
  beta: number | null;
  divYield: number | null;
  yearHigh: number | null;
  yearLow: number | null;
  fromHigh: number | null;
  p1w: number | null;
  p1m: number | null;
  p3m: number | null;
  p6m: number | null;
  pytd: number | null;
  p1y: number | null;
}

interface ScreenerResponse {
  updated: string | number;
  rows: Row[];
}

type SortKey = "symbol" | "price" | "chg" | "vol" | "mcap" | "sector";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 60;
const STRING_KEYS: SortKey[] = ["symbol", "sector"];

const COLUMNS: {
  key: SortKey;
  label: string;
  shortLabel?: string;
  align: "left" | "right";
  hideBelowMd?: boolean;
}[] = [
  { key: "symbol", label: "Symbol", align: "left" },
  { key: "price", label: "Price", align: "right" },
  { key: "chg", label: "% Chg", shortLabel: "Chg", align: "right" },
  { key: "vol", label: "Volume", align: "right", hideBelowMd: true },
  { key: "mcap", label: "Market cap", shortLabel: "Mkt cap", align: "right" },
  { key: "sector", label: "Sector", align: "left", hideBelowMd: true },
];

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 });
const money = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function fmtMcap(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  return compact.format(n);
}

function fmtVol(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  return compact.format(n);
}

function fmtPrice(n: number): string {
  if (!Number.isFinite(n)) return "—";
  // Cents are noise on five-figure prices (BRK-A) and blow out the mobile column
  if (n >= 10000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return money.format(n);
}

function fmtChg(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function fmtUpdated(updated: string | number): string {
  const d = new Date(updated);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

const inputClass =
  "rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-ivory placeholder:text-gray-600 focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/25";
const labelClass = "font-monodata text-[11px] uppercase tracking-widest text-gray-500";

export default function MarketResearchValuationPage() {
  const router = useRouter();

  const [rows, setRows] = useState<Row[]>([]);
  const [updated, setUpdated] = useState<string | number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("mcap");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/market/screener", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as ScreenerResponse;
      if (!Array.isArray(json.rows)) throw new Error("Bad response");
      setRows(json.rows);
      setUpdated(json.updated);
    } catch {
      setError("Could not load the stock list. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Debounce the search box so 1500-row filtering never fights the keystroke
  useEffect(() => {
    const t = setTimeout(() => setSearch(query.trim().toLowerCase()), 180);
    return () => clearTimeout(t);
  }, [query]);

  // Reset paging whenever the visible set changes
  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [search, sector, sortKey, sortDir]);

  const sectors = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.sector) set.add(r.sector);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filtered = useMemo(() => {
    let list = rows;
    if (sector) list = list.filter((r) => r.sector === sector);
    if (search) {
      list = list.filter(
        (r) => r.symbol.toLowerCase().includes(search) || r.name.toLowerCase().includes(search)
      );
    }
    const dir = sortDir === "asc" ? 1 : -1;
    const sorted = [...list];
    if (STRING_KEYS.includes(sortKey)) {
      sorted.sort((a, b) => dir * String(a[sortKey]).localeCompare(String(b[sortKey])));
    } else {
      sorted.sort((a, b) => {
        const av = Number(a[sortKey]);
        const bv = Number(b[sortKey]);
        const an = Number.isFinite(av) ? av : -Infinity;
        const bn = Number.isFinite(bv) ? bv : -Infinity;
        return dir * (an - bn);
      });
    }
    return sorted;
  }, [rows, sector, search, sortKey, sortDir]);

  const visible = useMemo(() => filtered.slice(0, limit), [filtered, limit]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(STRING_KEYS.includes(key) ? "asc" : "desc");
    }
  };

  const terminalHref = (symbol: string) => `/terminal?symbol=${encodeURIComponent(symbol)}`;

  const updatedLabel = updated != null ? fmtUpdated(updated) : "";

  return (
    <main className="min-h-screen bg-night text-ivory">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-14 md:py-20">
        {/* Header */}
        <Reveal>
          <Link href="/features" className="btn-ghost-gold !px-4 !py-2 text-sm mb-8">
            &larr; Back to Features
          </Link>
          <CommandLine cmd="VAL" note="research & valuation" className="mb-4" />
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <h1 className="font-display text-ivory text-4xl md:text-6xl tracking-tight">
                All US <em className="italic text-gold-soft">stocks</em>.
              </h1>
              <p className="mt-4 text-gray-300">
                Explore the full U.S. stock market: prices, volumes, and live charts. Click any row to open it in
                the Terminal.
              </p>
            </div>
            <div className={`${labelClass} tabular-nums md:text-right`}>
              {loading ? (
                <span className="inline-block h-3 w-40 rounded bg-white/[0.06] animate-pulse align-middle" />
              ) : error ? (
                <span>Not updated</span>
              ) : (
                <span>
                  {updatedLabel ? `Updated ${updatedLabel}` : "Updated"} · {rows.length.toLocaleString("en-US")}{" "}
                  stocks
                </span>
              )}
            </div>
          </div>
        </Reveal>

        {/* Controls + table */}
        <Reveal delay={0.1} className="mt-10 md:mt-12">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="relative block">
                <span className="sr-only">Search by symbol or company</span>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search symbol or company"
                  autoComplete="off"
                  spellCheck={false}
                  className={`${inputClass} w-full sm:w-72`}
                />
              </label>
              <label className="relative block">
                <span className="sr-only">Filter by sector</span>
                <select
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  style={{ colorScheme: "dark" }}
                  className={`${inputClass} w-full appearance-none pr-10 sm:w-56 ${sector ? "text-ivory" : "text-gray-400"}`}
                >
                  <option value="">All sectors</option>
                  {sectors.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </label>
            </div>
            <div className={`${labelClass} tabular-nums`}>
              {loading
                ? ""
                : `${filtered.length.toLocaleString("en-US")} of ${rows.length.toLocaleString("en-US")}`}
            </div>
          </div>

          <div className="card-night overflow-hidden mt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr className="bg-surface2">
                    {COLUMNS.map((c) => {
                      const active = c.key === sortKey;
                      return (
                        <th
                          key={c.key}
                          scope="col"
                          className={`px-2.5 md:px-6 py-3 font-normal ${
                            c.align === "right" ? "text-right" : "text-left"
                          } ${c.hideBelowMd ? "hidden md:table-cell" : ""}`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleSort(c.key)}
                            aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
                            className={`inline-flex items-center gap-1.5 ${labelClass} transition-colors hover:text-gray-300 ${
                              active ? "text-gold" : ""
                            } ${c.align === "right" ? "flex-row-reverse" : ""}`}
                          >
                            {c.shortLabel ? (
                              <>
                                <span className="md:hidden">{c.shortLabel}</span>
                                <span className="hidden md:inline">{c.label}</span>
                              </>
                            ) : (
                              <span>{c.label}</span>
                            )}
                            <span aria-hidden="true" className={`font-monodata text-[10px] ${active ? "" : "opacity-0"}`}>
                              {active && sortDir === "asc" ? "▲" : "▼"}
                            </span>
                          </button>
                        </th>
                      );
                    })}
                    <th scope="col" className="hidden md:table-cell px-6 py-3 text-right font-normal">
                      <span className="sr-only">Open in Terminal</span>
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    Array.from({ length: 12 }).map((_, i) => (
                      <tr key={i} className="border-t border-white/5">
                        <td className="px-2.5 md:px-6 py-3.5">
                          <div className="h-3.5 w-14 rounded bg-white/[0.06] animate-pulse" />
                          <div className="mt-2 h-2.5 w-36 rounded bg-white/[0.04] animate-pulse" />
                        </td>
                        <td className="px-2.5 md:px-6 py-3.5">
                          <div className="ml-auto h-3.5 w-16 rounded bg-white/[0.06] animate-pulse" />
                        </td>
                        <td className="px-2.5 md:px-6 py-3.5">
                          <div className="ml-auto h-5 w-16 rounded-md bg-white/[0.06] animate-pulse" />
                        </td>
                        <td className="hidden md:table-cell px-6 py-3.5">
                          <div className="ml-auto h-3.5 w-14 rounded bg-white/[0.06] animate-pulse" />
                        </td>
                        <td className="px-2.5 md:px-6 py-3.5">
                          <div className="ml-auto h-3.5 w-16 rounded bg-white/[0.06] animate-pulse" />
                        </td>
                        <td className="hidden md:table-cell px-6 py-3.5">
                          <div className="h-3.5 w-28 rounded bg-white/[0.04] animate-pulse" />
                        </td>
                        <td className="hidden md:table-cell px-6 py-3.5" />
                      </tr>
                    ))
                  ) : error ? (
                    <tr className="border-t border-white/5">
                      <td colSpan={7} className="px-6 py-16 text-center">
                        <p className="text-gray-300">{error}</p>
                        <button type="button" onClick={load} className="btn-ghost-gold mt-5 !py-2.5 text-sm">
                          Retry
                        </button>
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr className="border-t border-white/5">
                      <td colSpan={7} className="px-6 py-16 text-center">
                        <p className="text-gray-300">
                          No stocks match
                          {search ? (
                            <>
                              {" "}
                              <span className="font-monodata text-ivory">&ldquo;{query.trim()}&rdquo;</span>
                            </>
                          ) : null}
                          {sector ? ` in ${sector}` : ""}.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setQuery("");
                            setSector("");
                          }}
                          className="btn-ghost-gold mt-5 !py-2.5 text-sm"
                        >
                          Clear filters
                        </button>
                      </td>
                    </tr>
                  ) : (
                    visible.map((r) => {
                      const up = r.chg > 0;
                      const down = r.chg < 0;
                      const href = terminalHref(r.symbol);
                      return (
                        <tr
                          key={r.symbol}
                          onClick={() => router.push(href)}
                          className="border-t border-white/5 hover:bg-white/[0.03] cursor-pointer transition-colors"
                        >
                          <td className="px-2.5 md:px-6 py-3 align-top">
                            <Link
                              href={href}
                              onClick={(e) => e.stopPropagation()}
                              className="block font-semibold text-ivory hover:text-gold focus:outline-none focus-visible:text-gold"
                            >
                              <span className="font-monodata tabular-nums">{r.symbol}</span>
                              <span className="mt-0.5 block max-w-[5rem] truncate text-[11px] font-normal text-gray-500 md:max-w-xs md:text-xs">
                                {r.name}
                              </span>
                            </Link>
                          </td>
                          <td className="px-2.5 md:px-6 py-3 align-top text-right font-monodata tabular-nums text-ivory">
                            {fmtPrice(r.price)}
                          </td>
                          <td className="px-2.5 md:px-6 py-3 align-top text-right">
                            <span
                              className={`inline-block rounded-md px-1.5 py-0.5 font-monodata tabular-nums text-[11px] md:text-xs ${
                                up
                                  ? "bg-green-500/10 text-green-400"
                                  : down
                                  ? "bg-red-500/10 text-red-400"
                                  : "bg-white/[0.04] text-gray-400"
                              }`}
                            >
                              {fmtChg(r.chg)}
                            </span>
                          </td>
                          <td className="hidden md:table-cell px-6 py-3 align-top text-right font-monodata tabular-nums text-gray-300">
                            {fmtVol(r.vol)}
                          </td>
                          <td className="px-2.5 md:px-6 py-3 align-top text-right font-monodata tabular-nums text-gray-300">
                            {fmtMcap(r.mcap)}
                          </td>
                          <td className="hidden md:table-cell px-6 py-3 align-top text-gray-400">
                            {r.sector || "—"}
                          </td>
                          <td className="hidden md:table-cell px-6 py-3 align-top text-right">
                            <Link
                              href={href}
                              onClick={(e) => e.stopPropagation()}
                              className="font-monodata text-xs text-gray-500 transition-colors hover:text-gold whitespace-nowrap"
                            >
                              Open &rarr;
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {!loading && !error && filtered.length > 0 && (
              <div className="flex flex-col items-center gap-3 border-t border-white/5 px-6 py-5 sm:flex-row sm:justify-between">
                <span className={`${labelClass} tabular-nums`}>
                  Showing {visible.length.toLocaleString("en-US")} of {filtered.length.toLocaleString("en-US")}
                </span>
                {visible.length < filtered.length && (
                  <button
                    type="button"
                    onClick={() => setLimit((l) => l + PAGE_SIZE)}
                    className="btn-ghost-gold !py-2.5 text-sm"
                  >
                    Show {Math.min(PAGE_SIZE, filtered.length - visible.length)} more
                  </button>
                )}
              </div>
            )}
          </div>

          <p className="mt-4 font-monodata text-xs text-gray-500">
            Market data is for informational purposes only · WallStreetStocks.ai does not provide investment advice
          </p>
        </Reveal>
      </div>
    </main>
  );
}
