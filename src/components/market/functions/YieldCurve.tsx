"use client";

import React, { useMemo, useState } from "react";
import { FnPanel, Loading, Empty, useJson, th, td, isNum } from "./ui";

// GC — US Treasury par yield curve (FMP v4/treasury, ~3 months of dailies):
// today vs 1W / 1M / oldest available, bp changes and key spreads.

const TENORS = [
  { key: "month1", label: "1M" },
  { key: "month2", label: "2M" },
  { key: "month3", label: "3M" },
  { key: "month6", label: "6M" },
  { key: "year1", label: "1Y" },
  { key: "year2", label: "2Y" },
  { key: "year3", label: "3Y" },
  { key: "year5", label: "5Y" },
  { key: "year7", label: "7Y" },
  { key: "year10", label: "10Y" },
  { key: "year20", label: "20Y" },
  { key: "year30", label: "30Y" },
] as const;

type Row = { date: string } & Record<string, number | string>;

const H = 300;
const bp = (a?: number, b?: number) => (isNum(a) && isNum(b) ? Math.round((a - b) * 100) : null);
const bpTone = (v: number | null) => (v == null || v === 0 ? "text-gray-400" : v > 0 ? "text-red-400" : "text-green-400");
const fmtD = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

const YieldCurve: React.FC = () => {
  const { data, loading } = useJson<{ treasuryRates: Row[] }>("/api/bonds");
  const [hover, setHover] = useState<number | null>(null);
  const rates = useMemo(() => (data?.treasuryRates ?? []).filter((r) => r.date), [data]);

  const curves = useMemo(() => {
    if (!rates.length) return [];
    const pick = (daysBack: number) => {
      const target = new Date(`${rates[0].date}T00:00:00`);
      target.setDate(target.getDate() - daysBack);
      const t = target.toISOString().slice(0, 10);
      return rates.find((r) => r.date <= t) ?? rates[rates.length - 1];
    };
    return [
      { label: "Today", row: rates[0], color: "#FFD60A", width: 2.5 },
      { label: "1W ago", row: pick(7), color: "#38bdf8", width: 1.5 },
      { label: "1M ago", row: pick(30), color: "#a78bfa", width: 1.5 },
      { label: "3M ago", row: rates[rates.length - 1], color: "#6b7280", width: 1.5 },
    ];
  }, [rates]);

  const spreads = useMemo(() => {
    const defs = [
      { label: "2s10s", a: "year10", b: "year2" },
      { label: "3M10Y", a: "year10", b: "month3" },
      { label: "5s30s", a: "year30", b: "year5" },
    ];
    return defs.map((d) => {
      const hist = [...rates].reverse().map((r) => bp(r[d.a] as number, r[d.b] as number)).filter((v): v is number => v != null);
      return { ...d, now: hist[hist.length - 1] ?? null, hist };
    });
  }, [rates]);

  if (loading) return <FnPanel code="GC" title="Treasury Yield Curve"><Loading rows={10} /></FnPanel>;
  if (!curves.length) return <FnPanel code="GC" title="Treasury Yield Curve"><Empty text="Treasury curve data is unavailable right now." /></FnPanel>;

  let lo = Infinity;
  let hi = -Infinity;
  for (const c of curves) for (const t of TENORS) {
    const v = c.row[t.key] as number;
    if (isNum(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  }
  const pad = (hi - lo) * 0.12 || 0.2;
  lo -= pad;
  hi += pad;
  const W = 760;
  const L = 44;
  const x = (i: number) => L + (i / (TENORS.length - 1)) * (W - L - 20);
  const y = (v: number) => 12 + ((hi - v) / (hi - lo)) * (H - 44);

  return (
    <FnPanel code="GC" title="Treasury Yield Curve" subtitle={`US Treasury par yields · as of ${fmtD(rates[0].date)}`}>
      <div className="p-4 grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
        <div>
          <div className="flex flex-wrap gap-3 mb-2">
            {curves.map((c) => (
              <span key={c.label} className="flex items-center gap-1.5 text-[11px] font-mono font-bold" style={{ color: c.color }}>
                <span className="w-3 h-0.5" style={{ background: c.color }} />
                {c.label} <span className="text-gray-600 font-normal">{fmtD(c.row.date)}</span>
              </span>
            ))}
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseLeave={() => setHover(null)}>
            {Array.from({ length: 5 }, (_, k) => lo + ((hi - lo) * k) / 4).map((g) => (
              <g key={g}>
                <line x1={L} x2={W - 20} y1={y(g)} y2={y(g)} stroke="rgba(255,255,255,0.06)" />
                <text x={L - 8} y={y(g) + 3.5} textAnchor="end" fill="rgba(156,163,175,0.7)" fontSize="11" fontFamily="ui-monospace, monospace">
                  {g.toFixed(2)}%
                </text>
              </g>
            ))}
            {TENORS.map((t, i) => (
              <g key={t.key} onMouseEnter={() => setHover(i)}>
                <rect x={x(i) - 25} y={0} width={50} height={H} fill="transparent" />
                <text x={x(i)} y={H - 10} textAnchor="middle" fill={hover === i ? "#FFD60A" : "rgba(156,163,175,0.7)"} fontSize="11" fontFamily="ui-monospace, monospace">
                  {t.label}
                </text>
              </g>
            ))}
            {[...curves].reverse().map((c) => {
              const pts = TENORS.map((t, i) => [x(i), c.row[t.key] as number] as const).filter(([, v]) => isNum(v));
              const d = pts.map(([px, v], i) => `${i ? "L" : "M"} ${px} ${y(v)}`).join(" ");
              return (
                <g key={c.label}>
                  <path d={d} fill="none" stroke={c.color} strokeWidth={c.width} opacity={c.label === "Today" ? 1 : 0.8} />
                  {c.label === "Today" && pts.map(([px, v]) => <circle key={px} cx={px} cy={y(v)} r="3.5" fill={c.color} />)}
                </g>
              );
            })}
            {hover != null && (
              <line x1={x(hover)} x2={x(hover)} y1={12} y2={H - 30} stroke="rgba(255,214,10,0.4)" strokeDasharray="3 3" pointerEvents="none" />
            )}
          </svg>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {spreads.map((s) => {
              const min = Math.min(...s.hist);
              const max = Math.max(...s.hist);
              const path = s.hist.map((v, i) => `${i ? "L" : "M"} ${(i / Math.max(s.hist.length - 1, 1)) * 80} ${24 - ((v - min) / (max - min || 1)) * 22}`).join(" ");
              return (
                <div key={s.label} className="rounded-xl border border-white/10 p-2.5">
                  <p className="text-[10px] font-bold text-gray-500">{s.label}</p>
                  <p className={`font-mono text-sm font-bold ${s.now != null && s.now < 0 ? "text-red-400" : "text-gray-100"}`}>
                    {s.now != null ? `${s.now > 0 ? "+" : ""}${s.now}bp` : "—"}
                  </p>
                  <svg viewBox="0 0 80 26" className="w-full mt-1"><path d={path} fill="none" stroke="#FFD60A" strokeWidth="1.2" /></svg>
                </div>
              );
            })}
          </div>
          <table className="w-full text-left rounded-xl border border-white/10 overflow-hidden">
            <thead>
              <tr className="border-b border-white/10">
                <th className={th}>Tenor</th>
                <th className={`${th} text-right`}>Yield</th>
                <th className={`${th} text-right`}>1W</th>
                <th className={`${th} text-right`}>1M</th>
                <th className={`${th} text-right`}>3M</th>
              </tr>
            </thead>
            <tbody>
              {TENORS.map((t, i) => {
                const now = curves[0].row[t.key] as number;
                return (
                  <tr key={t.key} className={`border-b border-white/5 ${hover === i ? "bg-yellow-400/[0.06]" : ""}`}>
                    <td className={`${td} text-gray-300`}>{t.label}</td>
                    <td className={`${td} text-right text-gray-100 font-bold`}>{isNum(now) ? `${now.toFixed(2)}%` : "—"}</td>
                    {curves.slice(1).map((c) => {
                      const d = bp(now, c.row[t.key] as number);
                      return (
                        <td key={c.label} className={`${td} text-right ${bpTone(d)}`}>
                          {d != null ? `${d > 0 ? "+" : ""}${d}` : "—"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-[10px] text-gray-600">Changes in basis points. Red = yields higher.</p>
        </div>
      </div>
    </FnPanel>
  );
};

export default YieldCurve;
