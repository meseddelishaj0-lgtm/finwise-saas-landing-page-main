"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { FnPanel, Pills, Loading, Empty, th, td, fmtPctS, tone, fmtBarDate, fetchBars, isNum } from "./ui";
import { Bar, returnsOf, annualVol, maxDrawdown, correlation, betaOf } from "./ta";

// COMP — normalised comparative returns for up to 6 securities, with a
// risk table (vol, drawdown, the base's beta/correlation to each) and a
// correlation matrix (CORR).

const RANGES = ["3M", "6M", "YTD", "1Y", "5Y", "10Y"] as const;
const COLORS = ["#FFD60A", "#38bdf8", "#f472b6", "#4ade80", "#a78bfa", "#fb923c"];
const DEFAULT_BENCH = ["SPY", "QQQ"];
const H = 340;
const AXIS_R = 58;

/** As-of join: value of `bars` at or before each timestamp in `ts`. */
const alignTo = (ts: string[], bars: Bar[]): (number | null)[] => {
  const out: (number | null)[] = [];
  let j = 0;
  let last: number | null = null;
  for (const t of ts) {
    while (j < bars.length && bars[j].t <= t) last = bars[j++].c;
    out.push(last);
  }
  return out;
};

const CompareChart: React.FC<{ symbol: string; onSelect: (s: string) => void }> = ({ symbol, onSelect }) => {
  const [others, setOthers] = useState<string[]>(DEFAULT_BENCH.filter((s) => s !== symbol));
  const [range, setRange] = useState<string>("1Y");
  const [input, setInput] = useState("");
  const [series, setSeries] = useState<Record<string, Bar[]>>({});
  const [loading, setLoading] = useState(true);
  const [hover, setHover] = useState<number | null>(null);
  const [width, setWidth] = useState(800);
  const boxRef = useRef<HTMLDivElement>(null);

  const all = useMemo(() => [symbol, ...others.filter((o) => o !== symbol)].slice(0, 6), [symbol, others]);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver((e) => setWidth(e[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [loading]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all(all.map((s) => fetchBars(s, range).then((b) => [s, b] as const).catch(() => [s, []] as const)))
      .then((pairs) => alive && setSeries(Object.fromEntries(pairs)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [all, range]);

  const base = series[symbol] ?? [];
  const ts = base.map((b) => b.t);

  const lines = useMemo(() => {
    return all
      .map((s, i) => {
        const vals = s === symbol ? base.map((b) => b.c) : alignTo(ts, series[s] ?? []);
        const first = vals.find((v) => v != null) ?? null;
        const pct = vals.map((v) => (v != null && first ? (v / first - 1) * 100 : null));
        const closes = vals.filter(isNum);
        return { s, color: COLORS[i], vals, pct, closes, ok: closes.length > 1 };
      })
      .filter((l) => l.ok);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, series, symbol]);

  const perYear = range === "5Y" || range === "10Y" ? 52 : 252;
  const baseRets = returnsOf(lines.find((l) => l.s === symbol)?.closes ?? []);

  const n = ts.length;
  const plotW = Math.max(100, width - AXIS_R);
  let lo = 0;
  let hi = 0;
  for (const l of lines) for (const v of l.pct) if (v != null) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  const pad = (hi - lo) * 0.08 || 1;
  lo -= pad;
  hi += pad;
  const x = (i: number) => ((i + 0.5) / Math.max(n, 1)) * plotW;
  const y = (v: number) => 10 + ((hi - v) / (hi - lo || 1)) * (H - 36);
  const grid = Array.from({ length: 5 }, (_, k) => lo + ((hi - lo) * k) / 4);

  const add = () => {
    const s = input.trim().toUpperCase().replace(/[^A-Z0-9^./-]/g, "");
    if (s && !all.includes(s) && all.length < 6) setOthers((o) => [...o, s]);
    setInput("");
  };

  const hv = hover ?? n - 1;

  return (
    <FnPanel
      code="COMP"
      title="Comparative Returns"
      subtitle="Total price return, rebased to 0% at the start of the window"
      right={<Pills options={RANGES} value={range} onChange={setRange} />}
    >
      <div className="px-4 py-3 border-b border-white/5 flex flex-wrap items-center gap-2">
        {all.map((s, i) => (
          <span
            key={s}
            className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg border border-white/10 text-xs font-mono font-bold"
            style={{ color: COLORS[i] }}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
            {s.replace("^", "")}
            {s !== symbol && (
              <button onClick={() => setOthers((o) => o.filter((x) => x !== s))} className="ml-1 text-gray-500 hover:text-red-400" aria-label={`Remove ${s}`}>
                ×
              </button>
            )}
          </span>
        ))}
        {all.length < 6 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
            className="flex items-center gap-1"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Add ticker…"
              className="w-28 px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-xs font-mono uppercase text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-yellow-400/50"
            />
            <button className="px-2 py-1 rounded-lg border border-white/10 text-gray-400 text-xs hover:text-yellow-300">+</button>
          </form>
        )}
      </div>

      {loading ? (
        <Loading rows={8} />
      ) : lines.length === 0 || n < 2 ? (
        <Empty text="No overlapping price history for these securities." />
      ) : (
        <>
          <div
            ref={boxRef}
            className="relative px-2 pt-2 select-none"
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              const i = Math.round(((e.clientX - r.left - 8) / plotW) * n - 0.5);
              setHover(Math.max(0, Math.min(n - 1, i)));
            }}
            onMouseLeave={() => setHover(null)}
          >
            <svg width={width - 16} height={H} className="block">
              {grid.map((g, k) => (
                <g key={k}>
                  <line x1={0} x2={plotW} y1={y(g)} y2={y(g)} stroke={Math.abs(g) < 1e-9 ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.05)"} />
                  <text x={plotW + 6} y={y(g) + 3.5} fill="rgba(156,163,175,0.7)" fontSize="10.5" fontFamily="ui-monospace, monospace">
                    {g > 0 ? "+" : ""}
                    {g.toFixed(Math.abs(hi - lo) < 10 ? 1 : 0)}%
                  </text>
                </g>
              ))}
              <line x1={0} x2={plotW} y1={y(0)} y2={y(0)} stroke="rgba(255,255,255,0.3)" strokeDasharray="3 4" />
              {lines.map((l) => {
                let d = "";
                l.pct.forEach((v, i) => {
                  if (v != null) d += `${d ? " L" : "M"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`;
                });
                return <path key={l.s} d={d} fill="none" stroke={l.color} strokeWidth={l.s === symbol ? 2.2 : 1.5} />;
              })}
              {[0, Math.floor(n / 2), n - 1].map((i, k) => (
                <text key={k} x={x(i)} y={H - 6} textAnchor={k === 0 ? "start" : k === 2 ? "end" : "middle"} fill="rgba(156,163,175,0.6)" fontSize="10.5" fontFamily="ui-monospace, monospace">
                  {fmtBarDate(ts[i])}
                </text>
              ))}
              {hover != null && <line x1={x(hover)} x2={x(hover)} y1={10} y2={H - 26} stroke="rgba(255,214,10,0.45)" strokeDasharray="3 3" />}
            </svg>
            {hover != null && (
              <div
                className="absolute top-3 pointer-events-none rounded-lg border border-yellow-400/25 bg-black/90 px-3 py-2 font-mono text-[11px] min-w-[150px]"
                style={{ left: Math.min(Math.max(x(hover) - 75, 8), plotW - 150) }}
              >
                <p className="text-[10px] text-gray-400 mb-1">{fmtBarDate(ts[hover])}</p>
                {lines.map((l) => (
                  <p key={l.s} className="flex justify-between gap-4">
                    <span style={{ color: l.color }}>{l.s.replace("^", "")}</span>
                    <span className={tone(l.pct[hover])}>{fmtPctS(l.pct[hover])}</span>
                  </p>
                ))}
              </div>
            )}
          </div>

          <div className="overflow-x-auto border-t border-white/5">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10">
                  <th className={th}>Security</th>
                  <th className={`${th} text-right`}>{hover != null ? "At cursor" : "Return"}</th>
                  <th className={`${th} text-right`}>Volatility</th>
                  <th className={`${th} text-right`}>Max DD</th>
                  <th className={`${th} text-right`} title={`Beta of ${symbol} against each security`}>{symbol.replace("^", "")} β to</th>
                  <th className={`${th} text-right`}>Corr</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => {
                  const rets = returnsOf(l.closes);
                  return (
                    <tr key={l.s} className="border-b border-white/5 hover:bg-white/[0.03]">
                      <td className={td}>
                        <button onClick={() => onSelect(l.s)} className="font-bold hover:underline" style={{ color: l.color }}>
                          {l.s.replace("^", "")}
                        </button>
                      </td>
                      <td className={`${td} text-right font-bold ${tone(l.pct[hv])}`}>{fmtPctS(l.pct[hv])}</td>
                      <td className={`${td} text-right text-gray-300`}>{annualVol(rets, perYear).toFixed(1)}%</td>
                      <td className={`${td} text-right text-red-400`}>{maxDrawdown(l.closes).toFixed(1)}%</td>
                      <td className={`${td} text-right text-gray-300`}>{l.s === symbol ? "1.00" : betaOf(baseRets, rets)?.toFixed(2) ?? "—"}</td>
                      <td className={`${td} text-right text-gray-300`}>{l.s === symbol ? "1.00" : correlation(rets, baseRets)?.toFixed(2) ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {lines.length > 2 && (
            <div className="p-4 border-t border-white/5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Correlation matrix · {range} returns</p>
              <div className="overflow-x-auto">
                <table className="text-xs font-mono">
                  <thead>
                    <tr>
                      <th />
                      {lines.map((l) => (
                        <th key={l.s} className="px-3 py-1.5 text-[11px]" style={{ color: l.color }}>
                          {l.s.replace("^", "")}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((a) => (
                      <tr key={a.s}>
                        <th className="px-3 py-1.5 text-left text-[11px]" style={{ color: a.color }}>
                          {a.s.replace("^", "")}
                        </th>
                        {lines.map((b) => {
                          const c = a.s === b.s ? 1 : correlation(returnsOf(a.closes), returnsOf(b.closes));
                          return (
                            <td
                              key={b.s}
                              className="px-3 py-1.5 text-center tabular-nums text-gray-100"
                              style={isNum(c) ? { background: c >= 0 ? `rgba(255,214,10,${0.05 + c * 0.35})` : `rgba(56,189,248,${0.05 + -c * 0.35})` } : {}}
                            >
                              {isNum(c) ? c.toFixed(2) : "—"}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </FnPanel>
  );
};

export default CompareChart;
