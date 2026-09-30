"use client";

import React, { useMemo, useState } from "react";
import { FnPanel, Loading, Empty, useJson, th, td, fmtP, fmtPctS, fmtBig, tone, isNum } from "./ui";

// RV — the security against its peer group: valuation, size, momentum.

interface Row {
  symbol: string;
  name: string;
  price: number | null;
  changePercent: number | null;
  marketCap: number | null;
  pe: number | null;
  eps: number | null;
  beta: number | null;
  dividendYield: number | null;
  fromHigh: number | null;
  priceAvg50: number | null;
  priceAvg200: number | null;
  avgVolume: number | null;
}

type Col = { key: keyof Row | "vs200"; label: string; fmt: (r: Row) => string; cls?: (r: Row) => string; val: (r: Row) => number | null };

const vs200 = (r: Row) => (r.price && r.priceAvg200 ? (r.price / r.priceAvg200 - 1) * 100 : null);

const COLS: Col[] = [
  { key: "price", label: "Last", fmt: (r) => fmtP(r.price), val: (r) => r.price },
  { key: "changePercent", label: "% Chg", fmt: (r) => fmtPctS(r.changePercent), cls: (r) => tone(r.changePercent), val: (r) => r.changePercent },
  { key: "marketCap", label: "Mkt Cap", fmt: (r) => fmtBig(r.marketCap), val: (r) => r.marketCap },
  { key: "pe", label: "P/E", fmt: (r) => (isNum(r.pe) && r.pe > 0 ? r.pe.toFixed(1) : "—"), val: (r) => (isNum(r.pe) && r.pe > 0 ? r.pe : null) },
  { key: "eps", label: "EPS", fmt: (r) => fmtP(r.eps), val: (r) => r.eps },
  { key: "dividendYield", label: "Div Yld", fmt: (r) => (isNum(r.dividendYield) && r.dividendYield > 0 ? `${r.dividendYield.toFixed(2)}%` : "—"), val: (r) => r.dividendYield },
  { key: "beta", label: "Beta", fmt: (r) => (isNum(r.beta) ? r.beta.toFixed(2) : "—"), val: (r) => r.beta },
  { key: "vs200", label: "vs 200D", fmt: (r) => fmtPctS(vs200(r), 1), cls: (r) => tone(vs200(r)), val: vs200 },
  { key: "fromHigh", label: "From 52W Hi", fmt: (r) => fmtPctS(r.fromHigh, 1), cls: (r) => tone(r.fromHigh), val: (r) => r.fromHigh },
  { key: "avgVolume", label: "Avg Vol", fmt: (r) => fmtBig(r.avgVolume), val: (r) => r.avgVolume },
];

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const RelativeValue: React.FC<{ symbol: string; onSelect: (s: string) => void }> = ({ symbol, onSelect }) => {
  const { data, loading } = useJson<{ rows: Row[] }>(`/api/market/peers?symbol=${encodeURIComponent(symbol)}`);
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: "marketCap", dir: -1 });

  const rows = useMemo(() => {
    const list = data?.rows ?? [];
    const col = COLS.find((c) => c.key === sort.key)!;
    return [...list].sort((a, b) => ((col.val(a) ?? -Infinity) - (col.val(b) ?? -Infinity)) * sort.dir);
  }, [data, sort]);

  const peersOnly = rows.filter((r) => r.symbol !== symbol);

  return (
    <FnPanel code="RV" title="Relative Value" subtitle={`${symbol} vs peer group · ${peersOnly.length} peers`}>
      {loading ? (
        <Loading rows={8} />
      ) : rows.length < 2 ? (
        <Empty text="No peer group available for this security." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10">
                <th className={th}>Company</th>
                {COLS.map((c) => (
                  <th key={c.key} className={`${th} text-right`}>
                    <button
                      onClick={() => setSort((s) => ({ key: c.key, dir: s.key === c.key ? (-s.dir as 1 | -1) : -1 }))}
                      className={`hover:text-yellow-300 ${sort.key === c.key ? "text-yellow-300" : ""}`}
                    >
                      {c.label}
                      {sort.key === c.key ? (sort.dir === -1 ? " ▼" : " ▲") : ""}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.symbol}
                  className={`border-b border-white/5 ${r.symbol === symbol ? "bg-yellow-400/[0.07]" : "hover:bg-white/[0.03]"}`}
                >
                  <td className={`${td} max-w-[240px]`}>
                    <button onClick={() => onSelect(r.symbol)} className="text-left">
                      <span className={`font-bold ${r.symbol === symbol ? "text-yellow-300" : "text-gray-100 hover:text-yellow-300"}`}>{r.symbol}</span>
                      <span className="block text-[10px] text-gray-500 font-sans truncate max-w-[200px]">{r.name}</span>
                    </button>
                  </td>
                  {COLS.map((c) => (
                    <td key={c.key} className={`${td} text-right ${c.cls ? c.cls(r) : "text-gray-200"}`}>
                      {c.fmt(r)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t border-white/15 bg-white/[0.02]">
                <td className={`${td} text-gray-400 font-bold`}>Peer median</td>
                {COLS.map((c) => {
                  const m = median(peersOnly.map(c.val).filter(isNum));
                  const fake = { price: null, priceAvg200: null, [c.key]: m } as unknown as Row;
                  return (
                    <td key={c.key} className={`${td} text-right text-gray-400`}>
                      {c.key === "vs200" ? fmtPctS(m, 1) : c.fmt(fake)}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </FnPanel>
  );
};

export default RelativeValue;
