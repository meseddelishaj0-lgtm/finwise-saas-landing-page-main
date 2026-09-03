"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useQuotes, fmtPrice, fmtCap, Quote } from "./useQuotes";
import CommandLine from "@/components/ui/CommandLine";
import Reveal from "@/components/ui/Reveal";

const TABS: Record<string, string[]> = {
  Indices: ["^GSPC", "^IXIC", "^DJI", "^RUT", "^VIX", "GLD", "USO", "TLT"],
  Stocks: ["NVDA", "AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "AVGO", "JPM", "LLY"],
  Crypto: ["BTCUSD", "ETHUSD", "SOLUSD", "BNBUSD", "XRPUSD", "ADAUSD", "DOGEUSD", "LTCUSD"],
  ETFs: ["SPY", "QQQ", "DIA", "IWM", "VTI", "XLK", "XLF", "XLE", "ARKK", "SCHD"],
};

const NAME_OVERRIDES: Record<string, string> = {
  "^GSPC": "S&P 500",
  "^IXIC": "NASDAQ Composite",
  "^DJI": "Dow Jones",
  "^RUT": "Russell 2000",
  "^VIX": "CBOE Volatility",
};

type MoverTab = "Gainers" | "Losers";

const tabClass = (active: boolean) =>
  `px-3.5 py-1.5 rounded-md font-monodata text-[11px] uppercase tracking-wider whitespace-nowrap transition-colors border ${
    active
      ? "bg-gold/10 text-gold border-gold/30"
      : "text-gray-500 hover:text-gray-200 border-transparent"
  }`;

const MarketsBoard: React.FC = () => {
  const [tab, setTab] = useState<string>("Indices");
  const [moverTab, setMoverTab] = useState<MoverTab>("Gainers");
  const [movers, setMovers] = useState<Quote[]>([]);
  const { quotes, loading } = useQuotes(TABS[tab], 30000);

  useEffect(() => {
    let alive = true;
    fetch(`/api/market/movers?list=${moverTab.toLowerCase()}`)
      .then((r) => r.json())
      .then((d) => {
        if (alive && Array.isArray(d)) setMovers(d);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [moverTab]);

  return (
    <section className="relative w-full text-white bg-night py-16 md:py-20">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <Reveal>
          <div className="flex items-end justify-between gap-6 mb-8">
            <div>
              <CommandLine cmd="WEI" note="world equity indices" className="mb-4" />
              <h2 className="font-display text-ivory text-4xl md:text-5xl tracking-tight">
                Markets today
              </h2>
            </div>
            <Link
              href="/terminal"
              className="group hidden sm:inline-flex items-center gap-2 eyebrow hover:text-gold transition-colors"
            >
              Open Terminal <span className="arrow">→</span>
            </Link>
          </div>
        </Reveal>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* Main quotes table */}
          <Reveal delay={0.05} className="lg:col-span-2">
            <div className="card-night overflow-hidden">
              <div className="flex gap-1 p-2.5 border-b border-white/10 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {Object.keys(TABS).map((t) => (
                  <button key={t} type="button" onClick={() => setTab(t)} className={tabClass(tab === t)}>
                    {t}
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left eyebrow">
                      <th className="px-5 py-3 font-semibold">Symbol</th>
                      <th className="px-5 py-3 font-semibold text-right">Price</th>
                      <th className="px-5 py-3 font-semibold text-right">Change</th>
                      <th className="px-5 py-3 font-semibold text-right hidden md:table-cell">% Chg</th>
                      <th className="px-5 py-3 font-semibold text-right hidden lg:table-cell">Mkt cap / Vol</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && quotes.length === 0
                      ? [...Array(8)].map((_, i) => (
                          <tr key={i} className="border-t border-white/5">
                            <td colSpan={5} className="px-5 py-3.5">
                              <div className="h-6 rounded bg-white/[0.04] animate-pulse" />
                            </td>
                          </tr>
                        ))
                      : quotes.map((q) => {
                          const up = (q.changePercent || 0) >= 0;
                          return (
                            <tr key={q.symbol} className="border-t border-white/5 hover:bg-white/[0.03] transition-colors">
                              <td className="px-5 py-3.5">
                                <Link href={`/terminal?symbol=${encodeURIComponent(q.symbol)}`} className="group block">
                                  <span className="font-monodata font-semibold text-ivory group-hover:text-gold transition-colors">
                                    {q.symbol.replace("^", "")}
                                  </span>
                                  <span className="block text-xs text-gray-500 truncate max-w-[220px]">
                                    {NAME_OVERRIDES[q.symbol] || q.name}
                                  </span>
                                </Link>
                              </td>
                              <td className="px-5 py-3.5 text-right font-monodata tabular-nums text-gray-100">
                                ${fmtPrice(q.price)}
                              </td>
                              <td className={`px-5 py-3.5 text-right font-monodata tabular-nums font-semibold ${up ? "text-green-400" : "text-red-400"}`}>
                                {up ? "+" : ""}
                                {(q.change ?? 0).toFixed(2)}
                              </td>
                              <td className="px-5 py-3.5 text-right hidden md:table-cell">
                                <span
                                  className={`inline-block min-w-[78px] text-center px-2 py-1 rounded-md font-monodata text-xs font-semibold tabular-nums ${
                                    up ? "text-green-400 bg-green-500/10" : "text-red-400 bg-red-500/10"
                                  }`}
                                >
                                  {up ? "▲" : "▼"} {Math.abs(q.changePercent || 0).toFixed(2)}%
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-right font-monodata tabular-nums text-gray-400 hidden lg:table-cell">
                                {q.marketCap ? fmtCap(q.marketCap) : q.volume ? `${fmtCap(q.volume)} vol` : "—"}
                              </td>
                            </tr>
                          );
                        })}
                  </tbody>
                </table>
              </div>
            </div>
          </Reveal>

          {/* Movers sidebar */}
          <Reveal delay={0.1}>
            <div className="card-night overflow-hidden">
              <div className="flex gap-1 p-2.5 border-b border-white/10">
                {(["Gainers", "Losers"] as MoverTab[]).map((t) => {
                  const active = moverTab === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setMoverTab(t)}
                      className={`flex-1 px-3.5 py-1.5 rounded-md font-monodata text-[11px] uppercase tracking-wider transition-colors border ${
                        active
                          ? t === "Gainers"
                            ? "bg-green-500/10 text-green-400 border-green-500/30"
                            : "bg-red-500/10 text-red-400 border-red-500/30"
                          : "text-gray-500 hover:text-gray-200 border-transparent"
                      }`}
                    >
                      {t === "Gainers" ? "▲ Gainers" : "▼ Losers"}
                    </button>
                  );
                })}
              </div>
              <div className="p-2">
                {movers.length === 0
                  ? [...Array(8)].map((_, i) => (
                      <div key={i} className="h-[46px] m-1 rounded-lg bg-white/[0.03] animate-pulse" />
                    ))
                  : movers.slice(0, 9).map((m, idx) => {
                      const up = (m.changePercent || 0) >= 0;
                      return (
                        <Link
                          key={m.symbol}
                          href={`/terminal?symbol=${encodeURIComponent(m.symbol)}`}
                          className={`${idx >= 6 ? "hidden sm:flex" : "flex"} items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors`}
                        >
                          <div className="min-w-0 mr-3">
                            <span className="font-monodata font-semibold text-ivory text-sm">{m.symbol}</span>
                            <span className="block text-[11px] text-gray-500 truncate max-w-[150px]">{m.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="block font-monodata tabular-nums text-gray-100 text-sm">${fmtPrice(m.price)}</span>
                            <span className={`font-monodata tabular-nums text-[11px] font-semibold ${up ? "text-green-400" : "text-red-400"}`}>
                              {up ? "+" : ""}
                              {(m.changePercent || 0).toFixed(2)}%
                            </span>
                          </div>
                        </Link>
                      );
                    })}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
};

export default MarketsBoard;
