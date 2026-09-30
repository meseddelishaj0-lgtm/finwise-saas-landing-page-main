"use client";

import React, { useEffect, useMemo, useState } from "react";
import { FnPanel, Pills, Loading, Empty, th, td, fmtP, fmtChg, fmtPctS, fmtBig, tone, fmtBarDate, fetchBars } from "./ui";
import { Bar, rollUpBars, returnsOf, annualVol, maxDrawdown } from "./ta";

// HP — historical price table with period stats and CSV export.

const RANGES = ["1M", "3M", "6M", "YTD", "1Y", "5Y", "10Y"] as const;
const PERIODS = [
  { key: "D", label: "Daily" },
  { key: "W", label: "Weekly" },
  { key: "M", label: "Monthly" },
];

const HistoricalPrices: React.FC<{ symbol: string }> = ({ symbol }) => {
  const [range, setRange] = useState<string>("3M");
  const [per, setPer] = useState("D");
  const [bars, setBars] = useState<Bar[]>([]);
  const [loading, setLoading] = useState(true);

  // 1M ships hourly bars — fetch 3M dailies and trim instead.
  const fetchRange = range === "1M" ? "3M" : range;
  const weeklySource = range === "5Y" || range === "10Y";

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchBars(symbol, fetchRange)
      .then((b) => alive && setBars(b))
      .catch(() => alive && setBars([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [symbol, fetchRange]);

  const rows = useMemo(() => {
    let src = bars;
    if (range === "1M" && src.length) src = src.slice(-22);
    if (per === "W" && !weeklySource) src = rollUpBars(src, "W");
    if (per === "M") src = rollUpBars(src, "M");
    return src;
  }, [bars, range, per, weeklySource]);

  const stats = useMemo(() => {
    if (rows.length < 2) return null;
    const closes = rows.map((b) => b.c);
    let hi = rows[0];
    let lo = rows[0];
    for (const b of rows) {
      if (b.h > hi.h) hi = b;
      if (b.l < lo.l) lo = b;
    }
    const perYear = per === "M" ? 12 : per === "W" || weeklySource ? 52 : 252;
    return {
      ret: (closes[closes.length - 1] / closes[0] - 1) * 100,
      hi,
      lo,
      avgVol: rows.reduce((a, b) => a + b.v, 0) / rows.length,
      vol: annualVol(returnsOf(closes), perYear),
      mdd: maxDrawdown(closes),
      upDays: rows.filter((b, i) => i > 0 && b.c > rows[i - 1].c).length,
    };
  }, [rows, per, weeklySource]);

  const exportCsv = () => {
    const lines = ["Date,Open,High,Low,Close,Volume", ...rows.map((b) => `${b.t},${b.o},${b.h},${b.l},${b.c},${b.v}`)];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${symbol.replace(/[^A-Z0-9]/gi, "")}_${range}_${per}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const desc = [...rows].reverse();

  return (
    <FnPanel
      code="HP"
      title="Historical Prices"
      subtitle={`${symbol.replace("^", "")} · ${rows.length} bars`}
      right={
        <>
          <Pills options={RANGES} value={range} onChange={setRange} />
          <Pills options={weeklySource ? PERIODS.slice(1) : PERIODS} value={weeklySource && per === "D" ? "W" : per} onChange={setPer} />
          <button
            onClick={exportCsv}
            disabled={!rows.length}
            className="px-3 py-1.5 rounded-lg border border-yellow-400/40 text-yellow-300 text-[11px] font-bold hover:bg-yellow-400/10 disabled:opacity-40"
          >
            ⬇ CSV
          </button>
        </>
      }
    >
      {loading ? (
        <Loading rows={10} />
      ) : rows.length < 2 ? (
        <Empty text={`No price history for ${symbol}.`} />
      ) : (
        <>
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-white/5 border-b border-white/5">
              {[
                ["Period return", fmtPctS(stats.ret), tone(stats.ret)],
                ["Period high", `${fmtP(stats.hi.h)}`, "text-gray-100", fmtBarDate(stats.hi.t)],
                ["Period low", `${fmtP(stats.lo.l)}`, "text-gray-100", fmtBarDate(stats.lo.t)],
                ["Volatility (ann.)", `${stats.vol.toFixed(1)}%`, "text-gray-100"],
                ["Max drawdown", `${stats.mdd.toFixed(1)}%`, "text-red-400"],
                ["Avg volume", fmtBig(stats.avgVol), "text-gray-100", `${stats.upDays}/${rows.length - 1} up bars`],
              ].map(([label, value, cls, sub]) => (
                <div key={label} className="bg-surface px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">{label}</p>
                  <p className={`mt-1 font-mono text-sm font-bold tabular-nums ${cls}`}>{value}</p>
                  {sub && <p className="text-[10px] text-gray-600 font-mono">{sub}</p>}
                </div>
              ))}
            </div>
          )}
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-surface z-10">
                <tr className="border-b border-white/10">
                  <th className={th}>Date</th>
                  <th className={`${th} text-right`}>Open</th>
                  <th className={`${th} text-right`}>High</th>
                  <th className={`${th} text-right`}>Low</th>
                  <th className={`${th} text-right`}>Close</th>
                  <th className={`${th} text-right`}>Chg</th>
                  <th className={`${th} text-right`}>% Chg</th>
                  <th className={`${th} text-right`}>Volume</th>
                </tr>
              </thead>
              <tbody>
                {desc.map((b, i) => {
                  const prev = desc[i + 1];
                  const chg = prev ? b.c - prev.c : null;
                  const pct = prev && prev.c ? (chg! / prev.c) * 100 : null;
                  return (
                    <tr key={b.t} className="border-b border-white/5 hover:bg-white/[0.03]">
                      <td className={`${td} text-gray-400`}>{fmtBarDate(b.t)}</td>
                      <td className={`${td} text-right text-gray-300`}>{fmtP(b.o)}</td>
                      <td className={`${td} text-right text-gray-300`}>{fmtP(b.h)}</td>
                      <td className={`${td} text-right text-gray-300`}>{fmtP(b.l)}</td>
                      <td className={`${td} text-right text-gray-100 font-bold`}>{fmtP(b.c)}</td>
                      <td className={`${td} text-right ${tone(chg)}`}>{fmtChg(chg)}</td>
                      <td className={`${td} text-right ${tone(pct)}`}>{fmtPctS(pct)}</td>
                      <td className={`${td} text-right text-gray-400`}>{b.v ? fmtBig(b.v) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </FnPanel>
  );
};

export default HistoricalPrices;
