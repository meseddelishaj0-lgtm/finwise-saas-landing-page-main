"use client";

// Workbench functions that run on data the terminal already serves:
//   SEAG — monthly seasonality grid for the loaded security
//   LPAD — launchpad: several live charts side by side
// plus the macro strip under the terminal's top bar. (PORT lives in
// PortfolioPanel.tsx.)

import React, { useEffect, useMemo, useState } from "react";
import TerminalChart from "@/components/market/TerminalChart";
import { useQuotes } from "@/components/market/useQuotes";
import { FnPanel, Pills, Loading, Empty, fetchBars, th, td, fmtP, fmtPctS, tone, isNum } from "./ui";

const cleanSym = (s: string) => s.trim().toUpperCase().replace(/[^A-Z0-9^./-]/g, "").slice(0, 12);

/* ------------------------------- SEAG ------------------------------- */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const cellHeat = (pct: number | null): React.CSSProperties => {
  if (!isNum(pct) || pct === 0) return {};
  const a = Math.min(Math.abs(pct) / 12, 1) * 0.5 + 0.06;
  return { background: pct > 0 ? `rgba(74,222,128,${a})` : `rgba(248,113,113,${a})` };
};

export const Seasonality: React.FC<{ symbol: string }> = ({ symbol }) => {
  const [bars, setBars] = useState<{ t: string; c: number }[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setBars(null);
    setFailed(false);
    fetchBars(symbol, "10Y")
      .then((b) => alive && setBars(b))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [symbol]);

  const grid = useMemo(() => {
    if (!bars?.length) return null;
    // Last close of each month, then month-over-month returns.
    const closes = new Map<string, number>();
    for (const b of bars) if (isNum(b.c)) closes.set(b.t.slice(0, 7), b.c);
    const keys = [...closes.keys()].sort();
    const ret = new Map<string, number>();
    for (let i = 1; i < keys.length; i++) {
      const prev = closes.get(keys[i - 1])!;
      if (prev) ret.set(keys[i], (closes.get(keys[i])! / prev - 1) * 100);
    }
    const thisYear = String(new Date().getFullYear());
    // A leading stub year (history starting mid-year) would show a misleading annual total.
    const years = [...new Set([...ret.keys()].map((k) => k.slice(0, 4)))]
      .filter((y) => y === thisYear || [...ret.keys()].filter((k) => k.startsWith(y)).length >= 6)
      .sort()
      .reverse();
    const cell = (y: string, m: number) => ret.get(`${y}-${String(m + 1).padStart(2, "0")}`) ?? null;
    const stats = MONTHS.map((_, m) => {
      const vals = years.map((y) => cell(y, m)).filter(isNum);
      return {
        avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null,
        win: vals.length ? (vals.filter((v) => v > 0).length / vals.length) * 100 : null,
        n: vals.length,
      };
    });
    const yearTotal = (y: string) => {
      const vals = MONTHS.map((_, m) => cell(y, m)).filter(isNum);
      return vals.length ? (vals.reduce((acc, v) => acc * (1 + v / 100), 1) - 1) * 100 : null;
    };
    return { years, cell, stats, yearTotal, currentKey: keys[keys.length - 1] };
  }, [bars]);

  const thisMonth = new Date().getMonth();
  const best = grid ? grid.stats.reduce((b, s, i) => ((s.avg ?? -Infinity) > (grid.stats[b].avg ?? -Infinity) ? i : b), 0) : 0;
  const worst = grid ? grid.stats.reduce((b, s, i) => ((s.avg ?? Infinity) < (grid.stats[b].avg ?? Infinity) ? i : b), 0) : 0;

  return (
    <FnPanel code="SEAG" title={`Seasonality — ${symbol.replace("^", "")}`} subtitle="Monthly returns over the last ten years, with average and hit rate per month">
      {failed ? (
        <Empty text="Price history is unavailable for this symbol." />
      ) : !grid ? (
        <Loading rows={10} />
      ) : !grid.years.length ? (
        <Empty text="Not enough history to compute seasonality." />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-px bg-white/5 border-b border-white/5">
            {[
              { k: `${MONTHS[thisMonth]} average`, v: fmtPctS(grid.stats[thisMonth].avg), c: tone(grid.stats[thisMonth].avg), s: isNum(grid.stats[thisMonth].win) ? `up ${grid.stats[thisMonth].win!.toFixed(0)}% of years` : "" },
              { k: "Strongest month", v: MONTHS[best], c: "text-gray-100", s: `${fmtPctS(grid.stats[best].avg)} avg` },
              { k: "Weakest month", v: MONTHS[worst], c: "text-gray-100", s: `${fmtPctS(grid.stats[worst].avg)} avg` },
            ].map((x) => (
              <div key={x.k} className="bg-surface px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{x.k}</p>
                <p className={`mt-0.5 font-mono tabular-nums text-sm ${x.c}`}>{x.v}</p>
                <p className="text-[11px] text-gray-500">{x.s}</p>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-center">
              <thead>
                <tr className="border-b border-white/10">
                  <th className={`${th} text-left`}>Year</th>
                  {MONTHS.map((m, i) => (
                    <th key={m} className={`${th} ${i === thisMonth ? "!text-yellow-300" : ""}`}>{m}</th>
                  ))}
                  <th className={`${th} text-right`}>Year</th>
                </tr>
              </thead>
              <tbody>
                {grid.years.map((y) => {
                  const total = grid.yearTotal(y);
                  return (
                    <tr key={y} className="border-b border-white/5">
                      <td className={`${td} text-left text-gray-400`}>{y}</td>
                      {MONTHS.map((_, m) => {
                        const v = grid.cell(y, m);
                        return (
                          <td key={m} className={`${td} text-gray-100`} style={cellHeat(v)}>
                            {isNum(v) ? v.toFixed(1) : <span className="text-gray-700">·</span>}
                          </td>
                        );
                      })}
                      <td className={`${td} text-right font-bold ${tone(total)}`}>{fmtPctS(total, 1)}</td>
                    </tr>
                  );
                })}
                <tr className="border-t border-white/15 bg-white/[0.02]">
                  <td className={`${td} text-left font-bold text-yellow-300`}>Avg</td>
                  {grid.stats.map((s, m) => (
                    <td key={m} className={`${td} font-bold ${tone(s.avg)}`}>{isNum(s.avg) ? s.avg.toFixed(1) : "—"}</td>
                  ))}
                  <td />
                </tr>
                <tr className="bg-white/[0.02]">
                  <td className={`${td} text-left font-bold text-yellow-300`}>% up</td>
                  {grid.stats.map((s, m) => (
                    <td key={m} className={`${td} text-gray-300`}>{isNum(s.win) ? s.win.toFixed(0) : "—"}</td>
                  ))}
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
          <p className="px-4 py-2 border-t border-white/5 text-[10px] text-gray-600">
            Returns in %, month-end to month-end. The current month is partial. Past seasonality does not predict future returns.
          </p>
        </>
      )}
    </FnPanel>
  );
};

/* ------------------------------- LPAD ------------------------------- */

const LPAD_KEY = "wss_terminal_lpad";
const LPAD_DEFAULT = ["^GSPC", "NVDA", "BTCUSD", "GCUSD", "CLUSD", "EURUSD"];

const LpadTile: React.FC<{
  symbol: string;
  onChange: (s: string) => void;
  onOpen: (s: string) => void;
  quote?: { price: number; changePercent: number; previousClose?: number; name: string };
}> = ({ symbol, onChange, onOpen, quote }) => {
  const [draft, setDraft] = useState(symbol);
  useEffect(() => setDraft(symbol), [symbol]);
  const commit = () => {
    const s = cleanSym(draft);
    if (s && s !== symbol) onChange(s);
    else setDraft(symbol);
  };
  return (
    <div className="rounded-xl border border-white/10 bg-night/40 overflow-hidden min-w-0">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value.toUpperCase())}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          aria-label="Chart symbol"
          spellCheck={false}
          className="w-24 bg-transparent font-mono font-bold text-sm text-yellow-300 outline-none border-b border-transparent focus:border-yellow-400/50"
        />
        <span className="text-[11px] text-gray-500 truncate flex-1">{quote?.name ?? ""}</span>
        <span className="font-mono tabular-nums text-xs text-gray-100">{fmtP(quote?.price)}</span>
        <span className={`font-mono tabular-nums text-xs ${tone(quote?.changePercent)}`}>{fmtPctS(quote?.changePercent)}</span>
        <button onClick={() => onOpen(symbol)} title="Open in main chart" aria-label={`Open ${symbol} in main chart`} className="text-gray-500 hover:text-yellow-300 text-xs">↗</button>
      </div>
      <TerminalChart symbol={symbol} prevClose={quote?.previousClose} height={250} />
    </div>
  );
};

export const Launchpad: React.FC<{ onSelect: (s: string) => void }> = ({ onSelect }) => {
  const [symbols, setSymbols] = useState<string[]>(LPAD_DEFAULT);
  const [count, setCount] = useState("4");
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LPAD_KEY) || "null");
      if (saved && Array.isArray(saved.symbols) && saved.symbols.length === 6) setSymbols(saved.symbols.map(String));
      if (saved && ["2", "4", "6"].includes(saved.count)) setCount(saved.count);
    } catch {}
  }, []);
  const save = (next: string[], n = count) => {
    setSymbols(next);
    setCount(n);
    try { localStorage.setItem(LPAD_KEY, JSON.stringify({ symbols: next, count: n })); } catch {}
  };
  const shown = symbols.slice(0, Number(count));
  const { quotes } = useQuotes(shown, 30_000);
  const by = new Map(quotes.map((q) => [q.symbol, q]));

  return (
    <FnPanel
      code="LPAD"
      title="Launchpad"
      subtitle="Live charts side by side · type over a ticker to swap it · layout is saved in this browser"
      right={<Pills options={[{ key: "2", label: "2 charts" }, { key: "4", label: "4 charts" }, { key: "6", label: "6 charts" }]} value={count} onChange={(n) => save(symbols, n)} />}
    >
      <div className={`grid grid-cols-1 md:grid-cols-2 ${count === "6" ? "2xl:grid-cols-3" : ""} gap-3 p-3`}>
        {shown.map((s, i) => (
          <LpadTile
            key={`${i}-${s}`}
            symbol={s}
            quote={by.get(s)}
            onOpen={onSelect}
            onChange={(n) => save(symbols.map((x, j) => (j === i ? n : x)))}
          />
        ))}
      </div>
    </FnPanel>
  );
};

/* --------------------------- macro strip --------------------------- */

const MACRO = [
  { s: "ESUSD", l: "S&P fut" },
  { s: "NQUSD", l: "Nasdaq fut" },
  { s: "CLUSD", l: "WTI" },
  { s: "BZUSD", l: "Brent" },
  { s: "NGUSD", l: "Nat gas" },
  { s: "GCUSD", l: "Gold" },
  { s: "SIUSD", l: "Silver" },
  { s: "HGUSD", l: "Copper" },
  { s: "DXUSD", l: "Dollar" },
  { s: "ZNUSD", l: "10Y note" },
];

/** Always-on macro line under the terminal's top bar. */
export const MacroStrip: React.FC<{ onSelect: (s: string) => void; active: string }> = ({ onSelect, active }) => {
  const [rows, setRows] = useState<{ symbol: string; price: number | null; changePercent: number | null }[]>([]);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/market/global?view=futures")
        .then((r) => (r.ok ? r.json() : []))
        .then((d) => alive && Array.isArray(d) && setRows(d))
        .catch(() => {});
    load();
    const t = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
  const by = new Map(rows.map((r) => [r.symbol, r]));
  return (
    <div className="flex items-stretch rounded-xl border border-white/10 bg-surface overflow-x-auto" aria-label="Macro snapshot">
      {MACRO.map((m) => {
        const q = by.get(m.s);
        return (
          <button
            key={m.s}
            onClick={() => onSelect(m.s)}
            className={`flex-1 min-w-[104px] px-3 py-2 text-left border-r border-white/5 last:border-r-0 transition-colors ${active === m.s ? "bg-yellow-400/10" : "hover:bg-white/[0.04]"}`}
          >
            <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">{m.l}</span>
            <span className="block font-mono tabular-nums text-xs whitespace-nowrap">
              <span className="text-gray-100">{fmtP(q?.price)}</span>{" "}
              <span className={tone(q?.changePercent)}>{fmtPctS(q?.changePercent)}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
};
