"use client";

// Workbench functions that run on data the terminal already serves:
//   SEAG — monthly seasonality grid for the loaded security
//   LPAD — launchpad: several live charts side by side
//   PORT — a portfolio tracker kept in this browser

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

/* ------------------------------- PORT ------------------------------- */

const PORT_KEY = "wss_terminal_portfolio";
interface Position {
  symbol: string;
  shares: number;
  cost: number;
}

export const Portfolio: React.FC<{ symbol: string; onSelect: (s: string) => void }> = ({ symbol, onSelect }) => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({ symbol: "", shares: "", cost: "" });
  const [err, setErr] = useState("");

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PORT_KEY) || "[]");
      if (Array.isArray(saved)) setPositions(saved.filter((p) => p && typeof p.symbol === "string" && isNum(p.shares) && isNum(p.cost)));
    } catch {}
    setLoaded(true);
  }, []);
  const save = (next: Position[]) => {
    setPositions(next);
    try { localStorage.setItem(PORT_KEY, JSON.stringify(next)); } catch {}
  };

  const symbols = useMemo(() => positions.map((p) => p.symbol), [positions]);
  const { quotes } = useQuotes(symbols.length ? symbols : ["SPY"], 30_000);
  const by = new Map(quotes.map((q) => [q.symbol, q]));

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const s = cleanSym(form.symbol || symbol);
    const shares = Number(form.shares);
    const cost = Number(form.cost);
    if (!s) return setErr("Enter a ticker.");
    if (!(shares > 0)) return setErr("Enter the number of shares.");
    if (!(cost >= 0) || form.cost === "") return setErr("Enter your average cost per share.");
    if (!positions.some((p) => p.symbol === s) && positions.length >= 30) return setErr("The tracker holds up to 30 positions.");
    setErr("");
    const existing = positions.find((p) => p.symbol === s);
    if (existing) {
      // Adding to a position blends the cost basis.
      const total = existing.shares + shares;
      save(positions.map((p) => (p.symbol === s ? { symbol: s, shares: total, cost: (existing.shares * existing.cost + shares * cost) / total } : p)));
    } else save([...positions, { symbol: s, shares, cost }]);
    setForm({ symbol: "", shares: "", cost: "" });
  };

  const rows = positions.map((p) => {
    const q = by.get(p.symbol);
    const value = q ? q.price * p.shares : null;
    const basis = p.cost * p.shares;
    return {
      ...p,
      q,
      value,
      basis,
      dayPnl: q ? q.change * p.shares : null,
      pnl: value !== null ? value - basis : null,
      pnlPct: value !== null && basis > 0 ? (value / basis - 1) * 100 : null,
    };
  });
  const totValue = rows.reduce((s, r) => s + (r.value ?? 0), 0);
  const totBasis = rows.reduce((s, r) => s + (r.value !== null ? r.basis : 0), 0);
  const totDay = rows.reduce((s, r) => s + (r.dayPnl ?? 0), 0);
  const totPnl = totValue - totBasis;
  const sorted = [...rows].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const money = (v: number | null) => (isNum(v) ? `${v < 0 ? "−" : ""}$${Math.abs(v).toLocaleString(undefined, Math.abs(v) < 100 ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumFractionDigits: 0 })}` : "—");

  const input = "w-full px-3 py-2 rounded-lg bg-night border border-white/10 text-sm font-mono text-gray-100 placeholder-gray-600 outline-none focus:border-yellow-400/50";

  return (
    <FnPanel code="PORT" title="Portfolio Tracker" subtitle="Positions, live value and P&L · stored only in this browser">
      <form onSubmit={add} className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 p-3 border-b border-white/5">
        <label className="block">
          <span className="block mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Ticker</span>
          <input className={input} placeholder={symbol.replace("^", "")} value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })} spellCheck={false} />
        </label>
        <label className="block">
          <span className="block mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Shares</span>
          <input className={input} inputMode="decimal" placeholder="10" value={form.shares} onChange={(e) => setForm({ ...form, shares: e.target.value })} />
        </label>
        <label className="block">
          <span className="block mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Avg cost</span>
          <input className={input} inputMode="decimal" placeholder="150.00" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
        </label>
        <button type="submit" className="self-end px-4 py-2 rounded-lg bg-yellow-400 text-black text-xs font-black hover:bg-yellow-300 transition-colors">Add position</button>
        {err && <p className="col-span-full text-xs text-red-400" role="alert">{err}</p>}
      </form>

      {!loaded ? (
        <Loading rows={4} />
      ) : !positions.length ? (
        <Empty text="No positions yet. Add a ticker, share count and average cost above to track value and P&L here." />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/5 border-b border-white/5">
            {[
              { k: "Market value", v: money(totValue), c: "text-gray-100" },
              { k: "Day P&L", v: money(totDay), c: tone(totDay), s: totValue - totDay > 0 ? fmtPctS((totDay / (totValue - totDay)) * 100) : "" },
              { k: "Total P&L", v: money(totPnl), c: tone(totPnl), s: totBasis > 0 ? fmtPctS((totPnl / totBasis) * 100) : "" },
              { k: "Cost basis", v: money(totBasis), c: "text-gray-300" },
            ].map((x) => (
              <div key={x.k} className="bg-surface px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{x.k}</p>
                <p className={`mt-0.5 font-mono tabular-nums text-base ${x.c}`}>
                  {x.v} {x.s && <span className="text-[11px]">{x.s}</span>}
                </p>
              </div>
            ))}
          </div>

          {/* Allocation */}
          {totValue > 0 && (
            <div className="px-4 py-3 border-b border-white/5">
              <div className="flex h-2 rounded-full overflow-hidden gap-px bg-night">
                {sorted.filter((r) => r.value).map((r, i) => (
                  <span key={r.symbol} title={`${r.symbol} ${((r.value! / totValue) * 100).toFixed(1)}%`} style={{ width: `${(r.value! / totValue) * 100}%`, background: `rgba(250,204,21,${Math.max(0.18, 1 - i * 0.14)})` }} />
                ))}
              </div>
              <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[10px] text-gray-500 tabular-nums">
                {sorted.filter((r) => r.value).slice(0, 8).map((r) => (
                  <span key={r.symbol}><span className="text-gray-300">{r.symbol}</span> {((r.value! / totValue) * 100).toFixed(1)}%</span>
                ))}
              </p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10">
                  <th className={th}>Ticker</th>
                  <th className={`${th} text-right`}>Shares</th>
                  <th className={`${th} text-right`}>Avg cost</th>
                  <th className={`${th} text-right`}>Last</th>
                  <th className={`${th} text-right`}>Day %</th>
                  <th className={`${th} text-right`}>Day P&L</th>
                  <th className={`${th} text-right`}>Value</th>
                  <th className={`${th} text-right`}>Total P&L</th>
                  <th className={`${th} text-right`}>%</th>
                  <th className={th}><span className="sr-only">Remove</span></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr key={r.symbol} className="border-b border-white/5 hover:bg-white/[0.04]">
                    <td className={td}>
                      <button onClick={() => onSelect(r.symbol)} className="font-bold text-yellow-300 hover:underline">{r.symbol}</button>
                    </td>
                    <td className={`${td} text-right text-gray-300`}>{r.shares.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                    <td className={`${td} text-right text-gray-400`}>{fmtP(r.cost)}</td>
                    <td className={`${td} text-right text-gray-100`}>{fmtP(r.q?.price)}</td>
                    <td className={`${td} text-right ${tone(r.q?.changePercent)}`}>{fmtPctS(r.q?.changePercent)}</td>
                    <td className={`${td} text-right ${tone(r.dayPnl)}`}>{money(r.dayPnl)}</td>
                    <td className={`${td} text-right text-gray-100`}>{money(r.value)}</td>
                    <td className={`${td} text-right ${tone(r.pnl)}`}>{money(r.pnl)}</td>
                    <td className={`${td} text-right ${tone(r.pnlPct)}`}>{fmtPctS(r.pnlPct, 1)}</td>
                    <td className={`${td} text-right`}>
                      <button onClick={() => save(positions.filter((p) => p.symbol !== r.symbol))} aria-label={`Remove ${r.symbol}`} className="text-gray-600 hover:text-red-400">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
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
