"use client";

import React, { useMemo, useState } from "react";
import { FnPanel, Pills, Loading, Empty, useJson, th, td, fmtP, fmtChg, fmtPctS, tone, heat, isNum } from "./ui";
import { WORLD_INDICES, FUTURES } from "./universe";

// Market-wide boards: WEI (world indices), CMDTY (futures), MOST (movers),
// IMAP (sector performance).

interface GQuote {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  dayLow: number | null;
  dayHigh: number | null;
  yearLow: number | null;
  yearHigh: number | null;
  timestamp: number | null;
}

const RangeMini: React.FC<{ lo: number | null; hi: number | null; v: number | null }> = ({ lo, hi, v }) => {
  if (!isNum(lo) || !isNum(hi) || !isNum(v) || hi <= lo) return <span className="text-gray-600">—</span>;
  const pct = Math.min(100, Math.max(0, ((v - lo) / (hi - lo)) * 100));
  return (
    <span className="inline-block w-20 h-1.5 rounded-full bg-white/10 relative align-middle">
      <span className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-yellow-300" style={{ left: `calc(${pct}% - 4px)` }} />
    </span>
  );
};

const fmtTime = (ms: number | null) =>
  ms ? new Date(ms).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "—";

/* ------------------------------- WEI ------------------------------- */

export const WorldIndices: React.FC<{ onSelect: (s: string) => void }> = ({ onSelect }) => {
  const { data, loading } = useJson<GQuote[]>("/api/market/global?view=wei", 30_000);
  const by = new Map((data ?? []).map((q) => [q.symbol, q]));
  const regions = ["Americas", "EMEA", "Asia/Pacific"];

  return (
    <FnPanel code="WEI" title="World Equity Indices" subtitle="Live levels · refreshes every 30s · click a row to chart">
      {loading && !data ? (
        <Loading rows={12} />
      ) : !data?.length ? (
        <Empty text="World index data is unavailable right now." />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-px bg-white/5">
          {regions.map((region) => (
            <div key={region} className="bg-surface">
              <p className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-yellow-300 border-b border-white/5">{region}</p>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className={th}>Index</th>
                    <th className={`${th} text-right`}>Last</th>
                    <th className={`${th} text-right`}>Chg</th>
                    <th className={`${th} text-right`}>%</th>
                    <th className={`${th} text-right hidden sm:table-cell`}>52W</th>
                  </tr>
                </thead>
                <tbody>
                  {WORLD_INDICES.filter((i) => i.region === region).map((i) => {
                    const q = by.get(i.symbol);
                    const chartable = i.symbol.startsWith("^");
                    return (
                      <tr
                        key={i.symbol}
                        onClick={() => chartable && onSelect(i.symbol)}
                        className={`border-b border-white/5 ${chartable ? "cursor-pointer hover:bg-white/[0.04]" : ""}`}
                        title={q ? `Updated ${fmtTime(q.timestamp)}` : undefined}
                      >
                        <td className="px-3 py-2 text-xs">
                          <span className="font-semibold text-gray-100">{i.name}</span>
                          <span className="block text-[10px] font-mono text-gray-600">{i.symbol.replace("^", "")}</span>
                        </td>
                        <td className={`${td} text-right text-gray-100`}>{fmtP(q?.price)}</td>
                        <td className={`${td} text-right ${tone(q?.change)}`}>{fmtChg(q?.change)}</td>
                        <td className={`${td} text-right font-bold ${tone(q?.changePercent)}`} style={heat(q?.changePercent, 2)}>
                          {fmtPctS(q?.changePercent)}
                        </td>
                        <td className={`${td} text-right hidden sm:table-cell`}>
                          <RangeMini lo={q?.yearLow ?? null} hi={q?.yearHigh ?? null} v={q?.price ?? null} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </FnPanel>
  );
};

/* ------------------------------ CMDTY ------------------------------ */

export const FuturesBoard: React.FC<{ onSelect: (s: string) => void }> = ({ onSelect }) => {
  const { data, loading } = useJson<GQuote[]>("/api/market/global?view=futures", 30_000);
  const by = new Map((data ?? []).map((q) => [q.symbol, q]));
  const groups = Array.from(new Set(FUTURES.map((f) => f.group!)));

  return (
    <FnPanel code="CMDTY" title="Futures & Commodities" subtitle="Front-month futures · click a contract to chart">
      {loading && !data ? (
        <Loading rows={12} />
      ) : !data?.length ? (
        <Empty text="Futures data is unavailable right now." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px bg-white/5">
          {groups.map((g) => (
            <div key={g} className="bg-surface">
              <p className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-yellow-300 border-b border-white/5">{g}</p>
              {FUTURES.filter((f) => f.group === g).map((f) => {
                const q = by.get(f.symbol);
                return (
                  <button
                    key={f.symbol}
                    onClick={() => onSelect(f.symbol)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2 border-b border-white/5 hover:bg-white/[0.04] text-left"
                  >
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-gray-100 truncate">{f.name}</span>
                      <span className="block text-[10px] font-mono text-gray-600">{f.symbol}</span>
                    </span>
                    <span className="text-right font-mono tabular-nums">
                      <span className="block text-xs text-gray-100">{fmtP(q?.price)}</span>
                      <span className={`block text-[11px] font-bold ${tone(q?.changePercent)}`}>{fmtPctS(q?.changePercent)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </FnPanel>
  );
};

/* ------------------------------- MOST ------------------------------ */

const LISTS = [
  { key: "gainers", label: "Gainers" },
  { key: "losers", label: "Losers" },
  { key: "actives", label: "Most Active" },
];
const MARKETS = [
  { key: "stocks", label: "Stocks" },
  { key: "etf", label: "ETFs" },
  { key: "crypto", label: "Crypto" },
];

export const MostActive: React.FC<{ onSelect: (s: string) => void }> = ({ onSelect }) => {
  const [list, setList] = useState("gainers");
  const [market, setMarket] = useState("stocks");
  const { data, loading } = useJson<{ symbol: string; name: string; price: number; change: number; changePercent: number }[]>(
    `/api/market/movers?list=${list}&market=${list === "actives" ? "stocks" : market}`,
    60_000
  );

  return (
    <FnPanel
      code="MOST"
      title="Market Movers"
      subtitle="US session leaders"
      right={
        <>
          <Pills options={LISTS} value={list} onChange={setList} />
          {list !== "actives" && <Pills options={MARKETS} value={market} onChange={setMarket} />}
        </>
      }
    >
      {loading && !data ? (
        <Loading rows={10} />
      ) : !Array.isArray(data) || !data.length ? (
        <Empty text="No movers right now." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10">
                <th className={th}>#</th>
                <th className={th}>Security</th>
                <th className={`${th} text-right`}>Last</th>
                <th className={`${th} text-right`}>Chg</th>
                <th className={`${th} text-right`}>% Chg</th>
              </tr>
            </thead>
            <tbody>
              {data.map((m, i) => (
                <tr key={m.symbol} onClick={() => onSelect(m.symbol.replace("/", ""))} className="border-b border-white/5 cursor-pointer hover:bg-white/[0.04]">
                  <td className={`${td} text-gray-600`}>{i + 1}</td>
                  <td className="px-3 py-2 text-xs">
                    <span className="font-mono font-bold text-gray-100">{m.symbol}</span>
                    <span className="ml-2 text-gray-500 truncate">{m.name}</span>
                  </td>
                  <td className={`${td} text-right text-gray-100`}>{fmtP(m.price)}</td>
                  <td className={`${td} text-right ${tone(m.change)}`}>{fmtChg(m.change)}</td>
                  <td className={`${td} text-right font-bold ${tone(m.changePercent)}`} style={heat(m.changePercent, 10)}>
                    {fmtPctS(m.changePercent)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </FnPanel>
  );
};

/* ------------------------------- IMAP ------------------------------ */

export const SectorBoard: React.FC<{ onSelect: (s: string) => void }> = ({ onSelect }) => {
  const { data, loading } = useJson<{ sectors: { sector: string; etf: string; price: number; changePercent: number }[]; breadth: { score: number | null; advancing: number; total: number } }>(
    "/api/market/sectors",
    60_000
  );
  const sectors = useMemo(() => [...(data?.sectors ?? [])].sort((a, b) => b.changePercent - a.changePercent), [data]);
  const maxAbs = Math.max(0.5, ...sectors.map((s) => Math.abs(s.changePercent)));

  return (
    <FnPanel
      code="IMAP"
      title="Sector Performance"
      subtitle="S&P 500 sectors via SPDR sector ETFs"
      right={
        data?.breadth ? (
          <span className="text-[11px] font-mono text-gray-400">
            Breadth <span className="text-yellow-300 font-bold">{data.breadth.advancing}/{data.breadth.total}</span> sectors up
          </span>
        ) : null
      }
    >
      {loading && !data ? (
        <Loading rows={11} />
      ) : !sectors.length ? (
        <Empty text="Sector data is unavailable right now." />
      ) : (
        <div className="p-4 space-y-1.5">
          {sectors.map((s) => {
            const w = (Math.abs(s.changePercent) / maxAbs) * 50;
            const up = s.changePercent >= 0;
            return (
              <button key={s.etf} onClick={() => onSelect(s.etf)} className="w-full grid grid-cols-[150px_1fr_70px] sm:grid-cols-[200px_1fr_80px] items-center gap-3 group text-left">
                <span className="text-xs text-gray-300 group-hover:text-yellow-300 truncate">
                  {s.sector} <span className="font-mono text-[10px] text-gray-600">{s.etf}</span>
                </span>
                <span className="relative h-5 rounded bg-white/[0.03]">
                  <span className="absolute inset-y-0 left-1/2 w-px bg-white/15" />
                  <span
                    className={`absolute inset-y-0.5 rounded-sm ${up ? "bg-green-400/60" : "bg-red-400/60"}`}
                    style={up ? { left: "50%", width: `${w}%` } : { right: "50%", width: `${w}%` }}
                  />
                </span>
                <span className={`text-right font-mono text-xs font-bold tabular-nums ${tone(s.changePercent)}`}>{fmtPctS(s.changePercent)}</span>
              </button>
            );
          })}
        </div>
      )}
    </FnPanel>
  );
};
