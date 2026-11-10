"use client";

// PORT — portfolio tracker. Signed-in users read and edit their account's
// default portfolio (the one the mobile app syncs); everyone else gets a
// tracker stored in this browser. Analytics: performance of the current
// holdings against the S&P 500, sector exposure, beta, dividend income and
// the next earnings date for each holding.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuotes } from "@/components/market/useQuotes";
import { Tick } from "@/components/market/live";
import { FnPanel, Pills, Loading, Empty, useJson, fetchBars, th, td, fmtP, fmtPctS, tone, isNum } from "./ui";

const PORT_KEY = "wss_terminal_portfolio";
const cleanSym = (s: string) => s.trim().toUpperCase().replace(/[^A-Z0-9^./-]/g, "").slice(0, 12);

interface Position {
  symbol: string;
  shares: number;
  cost: number;
}
interface Meta {
  symbol: string;
  name: string;
  sector: string;
  beta: number | null;
  annualDividend: number | null;
  earnings: string | null;
}

const money = (v: number | null) =>
  isNum(v)
    ? `${v < 0 ? "−" : ""}$${Math.abs(v).toLocaleString(undefined, Math.abs(v) < 100 ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumFractionDigits: 0 })}`
    : "—";

/* ---- performance of today's holdings vs the S&P 500 ---- */

const RANGES = ["1M", "3M", "6M", "YTD", "1Y", "5Y"];

const Performance: React.FC<{ positions: Position[] }> = ({ positions }) => {
  const [range, setRange] = useState("1Y");
  const [series, setSeries] = useState<{ t: string; p: number; b: number }[] | null>(null);
  const [skipped, setSkipped] = useState<string[]>([]);
  // Largest dozen positions keep this to a bounded number of history requests.
  const key = positions.map((p) => `${p.symbol}:${p.shares}`).join(",");

  useEffect(() => {
    let alive = true;
    setSeries(null);
    (async () => {
      const top = [...positions].sort((a, b) => b.shares * b.cost - a.shares * a.cost).slice(0, 12);
      const [bench, ...rest] = await Promise.all([
        fetchBars("^GSPC", range).catch(() => []),
        ...top.map((p) => fetchBars(p.symbol, range).catch(() => [])),
      ]);
      if (!alive) return;
      const day = (t: string) => t.slice(0, 10);
      const maps = rest.map((bars: any[]) => new Map(bars.map((b) => [day(b.t), b.c as number])));
      const usable = top.filter((_, i) => maps[i].size > 1);
      setSkipped(top.filter((_, i) => maps[i].size <= 1).map((p) => p.symbol));
      const dates = [...new Set((bench as any[]).map((b) => day(b.t)))];
      const benchMap = new Map((bench as any[]).map((b) => [day(b.t), b.c as number]));
      const last = usable.map(() => NaN);
      const rows: { t: string; v: number; b: number }[] = [];
      for (const d of dates) {
        usable.forEach((p, i) => {
          const c = maps[top.indexOf(p)].get(d);
          if (isNum(c)) last[i] = c;
        });
        // Start once every holding has a price.
        if (last.some((x) => !isNum(x))) continue;
        rows.push({ t: d, v: usable.reduce((s, p, i) => s + p.shares * last[i], 0), b: benchMap.get(d)! });
      }
      if (rows.length < 2) return setSeries([]);
      setSeries(rows.map((r) => ({ t: r.t, p: (r.v / rows[0].v - 1) * 100, b: (r.b / rows[0].b - 1) * 100 })));
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, range]);

  const W = 900;
  const H = 220;
  const chart = useMemo(() => {
    if (!series?.length) return null;
    const all = series.flatMap((s) => [s.p, s.b]);
    const lo = Math.min(...all, 0);
    const hi = Math.max(...all, 0);
    const pad = (hi - lo || 1) * 0.08;
    const y = (v: number) => 8 + (1 - (v - (lo - pad)) / (hi - lo + 2 * pad)) * (H - 16);
    const x = (i: number) => (i / (series.length - 1)) * W;
    const line = (k: "p" | "b") => series.map((s, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(s[k]).toFixed(1)}`).join("");
    return { p: line("p"), b: line("b"), zero: y(0) };
  }, [series]);
  const end = series?.[series.length - 1];

  return (
    <div className="border-b border-white/5">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-yellow-300">Performance vs S&amp;P 500</p>
          <p className="text-[11px] text-gray-500">How today&apos;s holdings and share counts would have performed. Past trades and cash flows are not included.</p>
        </div>
        <Pills options={RANGES} value={range} onChange={setRange} />
      </div>
      {!series ? (
        <div className="h-[220px] m-4 rounded-lg bg-white/[0.03] animate-pulse" />
      ) : !chart || !end ? (
        <Empty text="Not enough price history to chart these holdings." />
      ) : (
        <div className="px-4 pb-3">
          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 font-mono text-xs tabular-nums">
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-yellow-400" /><span className="text-gray-300">Portfolio</span><span className={tone(end.p)}>{fmtPctS(end.p)}</span></span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-gray-400" /><span className="text-gray-300">S&amp;P 500</span><span className={tone(end.b)}>{fmtPctS(end.b)}</span></span>
            <span className="text-gray-500">Difference <span className={tone(end.p - end.b)}>{fmtPctS(end.p - end.b)}</span></span>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[220px] mt-1" preserveAspectRatio="none" role="img" aria-label={`Portfolio ${fmtPctS(end.p)} versus S&P 500 ${fmtPctS(end.b)} over ${range}`}>
            <line x1={0} x2={W} y1={chart.zero} y2={chart.zero} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
            <path d={chart.b} fill="none" stroke="#9CA3AF" strokeWidth={1.3} vectorEffect="non-scaling-stroke" />
            <path d={chart.p} fill="none" stroke="#FACC15" strokeWidth={1.8} vectorEffect="non-scaling-stroke" />
          </svg>
          <p className="flex justify-between font-mono text-[10px] text-gray-600">
            <span>{series[0].t}</span>
            {skipped.length > 0 && <span>No history for {skipped.join(", ")}</span>}
            <span>{end.t}</span>
          </p>
        </div>
      )}
    </div>
  );
};

/* ------------------------------ panel ------------------------------ */

export const Portfolio: React.FC<{ symbol: string; onSelect: (s: string) => void }> = ({ symbol, onSelect }) => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [source, setSource] = useState<"loading" | "account" | "local">("loading");
  const [name, setName] = useState("");
  const [form, setForm] = useState({ symbol: "", shares: "", cost: "" });
  const [err, setErr] = useState("");

  const loadAccount = useCallback(async () => {
    const r = await fetch("/api/terminal/portfolio", { cache: "no-store" });
    if (!r.ok) throw new Error(String(r.status));
    const d = await r.json();
    if (!d.signedIn) throw new Error("signed out");
    setPositions(Array.isArray(d.holdings) ? d.holdings : []);
    setName(d.name || "");
  }, []);

  useEffect(() => {
    loadAccount()
      .then(() => setSource("account"))
      .catch(() => {
        try {
          const saved = JSON.parse(localStorage.getItem(PORT_KEY) || "[]");
          if (Array.isArray(saved)) setPositions(saved.filter((p) => p && typeof p.symbol === "string" && isNum(p.shares) && isNum(p.cost)));
        } catch {}
        setSource("local");
      });
  }, [loadAccount]);

  const saveLocal = (next: Position[]) => {
    setPositions(next);
    try { localStorage.setItem(PORT_KEY, JSON.stringify(next)); } catch {}
  };

  const upsert = async (p: Position) => {
    const next = positions.some((x) => x.symbol === p.symbol) ? positions.map((x) => (x.symbol === p.symbol ? p : x)) : [...positions, p];
    if (source !== "account") return saveLocal(next);
    setPositions(next);
    const r = await fetch("/api/terminal/portfolio", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) }).catch(() => null);
    if (!r?.ok) {
      const d = await r?.json().catch(() => null);
      setErr(d?.error || "That change could not be saved to your account.");
      loadAccount().catch(() => {});
    }
  };
  const remove = async (s: string) => {
    const next = positions.filter((p) => p.symbol !== s);
    if (source !== "account") return saveLocal(next);
    setPositions(next);
    const r = await fetch(`/api/terminal/portfolio?symbol=${encodeURIComponent(s)}`, { method: "DELETE" }).catch(() => null);
    if (!r?.ok) {
      setErr("That holding could not be removed from your account.");
      loadAccount().catch(() => {});
    }
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const s = cleanSym(form.symbol || symbol);
    const shares = Number(form.shares);
    const cost = Number(form.cost);
    if (!s) return setErr("Enter a ticker.");
    if (!(shares > 0)) return setErr("Enter the number of shares.");
    if (!(cost >= 0) || form.cost === "") return setErr("Enter your average cost per share.");
    const existing = positions.find((p) => p.symbol === s);
    if (!existing && positions.length >= 30) return setErr("The tracker shows up to 30 positions here.");
    setErr("");
    // Adding to a position blends the cost basis.
    const total = (existing?.shares ?? 0) + shares;
    upsert({ symbol: s, shares: total, cost: existing ? (existing.shares * existing.cost + shares * cost) / total : cost });
    setForm({ symbol: "", shares: "", cost: "" });
  };

  const symbols = useMemo(() => positions.map((p) => p.symbol).slice(0, 30), [positions]);
  const { quotes } = useQuotes(symbols.length ? symbols : ["SPY"], 30_000, true);
  const by = new Map(quotes.map((q) => [q.symbol, q]));
  const meta = useJson<Meta[]>(symbols.length ? `/api/market/desk?view=holdings&symbols=${encodeURIComponent(symbols.join(","))}` : null);
  const metaBy = new Map((Array.isArray(meta.data) ? meta.data : []).map((m) => [m.symbol, m]));

  const rows = positions.map((p) => {
    const q = by.get(p.symbol);
    const value = q ? q.price * p.shares : null;
    const basis = p.cost * p.shares;
    return {
      ...p, q, value, basis,
      dayPnl: q ? q.change * p.shares : null,
      pnl: value !== null ? value - basis : null,
      pnlPct: value !== null && basis > 0 ? (value / basis - 1) * 100 : null,
      m: metaBy.get(p.symbol),
    };
  });
  const totValue = rows.reduce((s, r) => s + (r.value ?? 0), 0);
  const totBasis = rows.reduce((s, r) => s + (r.value !== null ? r.basis : 0), 0);
  const totDay = rows.reduce((s, r) => s + (r.dayPnl ?? 0), 0);
  const totPnl = totValue - totBasis;
  const sorted = [...rows].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  // Exposure and risk, weighted by market value.
  const sectors = new Map<string, number>();
  let betaW = 0;
  let betaSum = 0;
  let income = 0;
  for (const r of rows) {
    if (!r.value) continue;
    sectors.set(r.m?.sector ?? "Other", (sectors.get(r.m?.sector ?? "Other") ?? 0) + r.value);
    if (isNum(r.m?.beta)) {
      betaSum += r.m!.beta! * r.value;
      betaW += r.value;
    }
    if (isNum(r.m?.annualDividend)) income += r.m!.annualDividend! * r.shares;
  }
  const sectorRows = [...sectors.entries()].sort((a, b) => b[1] - a[1]);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = rows.filter((r) => r.m?.earnings && r.m.earnings >= today).sort((a, b) => a.m!.earnings!.localeCompare(b.m!.earnings!)).slice(0, 8);

  const input = "w-full px-3 py-2 rounded-lg bg-night border border-white/10 text-sm font-mono text-gray-100 placeholder-gray-600 outline-none focus:border-yellow-400/50";

  return (
    <FnPanel
      code="PORT"
      title={source === "account" && name ? `Portfolio — ${name}` : "Portfolio Tracker"}
      subtitle={
        source === "account"
          ? "Synced with your account and the mobile app"
          : "Stored only in this browser"
      }
      right={
        source === "local" ? (
          <Link href="/login?callbackUrl=/terminal?fn=PORT" className="px-2.5 py-1 rounded-lg border border-yellow-400/30 text-[11px] font-bold text-yellow-300 hover:bg-yellow-400/10">
            Sign in to sync with the app
          </Link>
        ) : undefined
      }
    >
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

      {source === "loading" ? (
        <Loading rows={4} />
      ) : !positions.length ? (
        <Empty text="No positions yet. Add a ticker, share count and average cost above to track value, P&L and risk here." />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-px bg-white/5 border-b border-white/5">
            {[
              { k: "Market value", v: money(totValue), c: "text-gray-100" },
              { k: "Day P&L", v: money(totDay), c: tone(totDay), s: totValue - totDay > 0 ? fmtPctS((totDay / (totValue - totDay)) * 100) : "" },
              { k: "Total P&L", v: money(totPnl), c: tone(totPnl), s: totBasis > 0 ? fmtPctS((totPnl / totBasis) * 100) : "" },
              { k: "Cost basis", v: money(totBasis), c: "text-gray-300" },
              { k: "Beta vs market", v: betaW > 0 ? (betaSum / betaW).toFixed(2) : "—", c: "text-gray-100" },
              { k: "Dividend income / yr", v: income > 0 ? money(income) : "—", c: "text-gray-100", s: income > 0 && totValue > 0 ? `${((income / totValue) * 100).toFixed(2)}%` : "" },
            ].map((x) => (
              <div key={x.k} className="bg-surface px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{x.k}</p>
                <p className={`mt-0.5 font-mono tabular-nums text-base ${x.c}`}>
                  {x.v} {x.s && <span className="text-[11px]">{x.s}</span>}
                </p>
              </div>
            ))}
          </div>

          <Performance positions={positions} />

          <div className="grid grid-cols-1 lg:grid-cols-2 border-b border-white/5">
            <div className="p-4 lg:border-r border-white/5">
              <p className="text-[10px] font-black uppercase tracking-widest text-yellow-300 mb-2">Sector exposure</p>
              {sectorRows.length ? (
                <div className="space-y-1.5">
                  {sectorRows.map(([s, v]) => (
                    <div key={s} className="grid grid-cols-[minmax(0,1fr)_120px_48px] items-center gap-2 text-xs">
                      <span className="text-gray-300 truncate">{s}</span>
                      <span className="h-1.5 rounded-full bg-white/10 overflow-hidden"><span className="block h-full bg-yellow-400" style={{ width: `${(v / sectorRows[0][1]) * 100}%` }} /></span>
                      <span className="font-mono tabular-nums text-right text-gray-400">{((v / totValue) * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-600">Loading…</p>
              )}
            </div>
            <div className="p-4 border-t lg:border-t-0 border-white/5">
              <p className="text-[10px] font-black uppercase tracking-widest text-yellow-300 mb-2">Upcoming earnings</p>
              {upcoming.length ? (
                <div className="space-y-1.5">
                  {upcoming.map((r) => (
                    <button key={r.symbol} onClick={() => onSelect(r.symbol)} className="w-full flex items-center justify-between text-xs hover:text-yellow-200">
                      <span><span className="font-mono font-bold text-gray-100">{r.symbol}</span> <span className="text-gray-500">{r.m?.name}</span></span>
                      <span className="font-mono text-gray-400">{new Date(`${r.m!.earnings}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-600">No earnings dates on file for these holdings.</p>
              )}
            </div>
          </div>

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
                  <th className={`${th} text-right`}>Weight</th>
                  <th className={`${th} text-right`}>Total P&L</th>
                  <th className={`${th} text-right`}>%</th>
                  <th className={th}><span className="sr-only">Remove</span></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr key={r.symbol} className="border-b border-white/5 hover:bg-white/[0.04]">
                    <td className={td}><button onClick={() => onSelect(r.symbol)} className="font-bold text-yellow-300 hover:underline">{r.symbol}</button></td>
                    <td className={`${td} text-right text-gray-300`}>{r.shares.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                    <td className={`${td} text-right text-gray-400`}>{fmtP(r.cost)}</td>
                    <td className={`${td} text-right text-gray-100`}><Tick value={r.q?.price} className="rounded px-1 -mx-1">{fmtP(r.q?.price)}</Tick></td>
                    <td className={`${td} text-right ${tone(r.q?.changePercent)}`}>{fmtPctS(r.q?.changePercent)}</td>
                    <td className={`${td} text-right ${tone(r.dayPnl)}`}>{money(r.dayPnl)}</td>
                    <td className={`${td} text-right text-gray-100`}>{money(r.value)}</td>
                    <td className={`${td} text-right text-gray-400`}>{r.value && totValue ? `${((r.value / totValue) * 100).toFixed(1)}%` : "—"}</td>
                    <td className={`${td} text-right ${tone(r.pnl)}`}>{money(r.pnl)}</td>
                    <td className={`${td} text-right ${tone(r.pnlPct)}`}>{fmtPctS(r.pnlPct, 1)}</td>
                    <td className={`${td} text-right`}>
                      <button onClick={() => remove(r.symbol)} aria-label={`Remove ${r.symbol}`} className="text-gray-600 hover:text-red-400">✕</button>
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
