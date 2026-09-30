"use client";

import React, { useMemo, useState } from "react";
import { FnPanel, Pills, Loading, Empty, useJson, heat, isNum } from "./ui";
import { FX_CURRENCIES } from "./universe";

// FXC — cross-rate matrix derived from USD pairs. Cell (row A, col B) is the
// price of 1 A in B, with the day's % move from each pair's previous close.

interface GQuote {
  symbol: string;
  price: number | null;
  previousClose: number | null;
}

const FxMatrix: React.FC<{ onSelect: (s: string) => void }> = ({ onSelect }) => {
  const { data, loading } = useJson<GQuote[]>("/api/market/global?view=fx", 30_000);
  const [mode, setMode] = useState("rate");

  // Units of each currency per 1 USD, now and at the previous close.
  const perUsd = useMemo(() => {
    const now: Record<string, number> = { USD: 1 };
    const prev: Record<string, number> = { USD: 1 };
    const by = new Map((data ?? []).map((q) => [q.symbol, q]));
    for (const c of FX_CURRENCIES) {
      if (!c.pair) continue;
      const q = by.get(c.pair);
      if (!q || !isNum(q.price) || q.price <= 0) continue;
      const pc = isNum(q.previousClose) && q.previousClose > 0 ? q.previousClose : q.price;
      now[c.code] = c.usdIsBase ? q.price : 1 / q.price;
      prev[c.code] = c.usdIsBase ? pc : 1 / pc;
    }
    return { now, prev };
  }, [data]);

  const codes = FX_CURRENCIES.map((c) => c.code).filter((c) => perUsd.now[c]);
  const fmt = (v: number) => (v >= 100 ? v.toFixed(2) : v >= 10 ? v.toFixed(3) : v.toFixed(4));

  return (
    <FnPanel
      code="FXC"
      title="FX Cross Rates"
      subtitle="Row currency priced in column currency · click a cell to chart the pair"
      right={<Pills options={[{ key: "rate", label: "Rates" }, { key: "chg", label: "% Change" }]} value={mode} onChange={setMode} />}
    >
      {loading && !data ? (
        <Loading rows={10} />
      ) : codes.length < 3 ? (
        <Empty text="FX data is unavailable right now." />
      ) : (
        <div className="overflow-x-auto p-3">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr>
                <th className="px-2 py-2 text-left text-[10px] text-gray-600">1 ↓ in →</th>
                {codes.map((c) => (
                  <th key={c} className="px-2 py-2 text-yellow-300 text-[11px] font-black">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {codes.map((a) => (
                <tr key={a} className="border-t border-white/5">
                  <th className="px-2 py-2 text-left text-yellow-300 text-[11px] font-black">{a}</th>
                  {codes.map((b) => {
                    if (a === b) return <td key={b} className="px-2 py-2 text-center text-gray-700">—</td>;
                    const rate = perUsd.now[b] / perUsd.now[a];
                    const prev = perUsd.prev[b] / perUsd.prev[a];
                    const chg = prev ? (rate / prev - 1) * 100 : null;
                    return (
                      <td
                        key={b}
                        onClick={() => onSelect(`${a}${b}`)}
                        className="px-2 py-2 text-center tabular-nums cursor-pointer hover:outline hover:outline-1 hover:outline-yellow-400/60 text-gray-100"
                        style={heat(chg, 1)}
                        title={`${a}/${b} ${fmt(rate)} (${chg != null ? chg.toFixed(2) : "—"}%)`}
                      >
                        {mode === "rate" ? fmt(rate) : chg != null ? `${chg > 0 ? "+" : ""}${chg.toFixed(2)}%` : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </FnPanel>
  );
};

export default FxMatrix;
