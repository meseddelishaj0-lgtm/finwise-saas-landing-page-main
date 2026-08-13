"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useQuotes, fmtPrice, fmtCap, Quote } from "./useQuotes";
import CommandLine from "@/components/ui/CommandLine";

const TABS: Record<string, string[]> = {
  Indices: ["^GSPC", "^IXIC", "^DJI", "^RUT", "^VIX", "GLD", "USO", "TLT"],
  Stocks: ["NVDA", "AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "AVGO", "JPM", "LLY"],
  Crypto: ["BTCUSD", "ETHUSD", "SOLUSD", "BNBUSD", "XRPUSD", "ADAUSD", "DOGEUSD", "LTCUSD"],
  ETFs: ["SPY", "QQQ", "DIA", "IWM", "VTI", "XLK", "XLF", "XLE", "ARKK", "SCHD"],
};

const NAME_OVERRIDES: Record<string, string> = {
  "^GSPC": "S&P 500", "^IXIC": "NASDAQ Composite", "^DJI": "Dow Jones", "^RUT": "Russell 2000", "^VIX": "CBOE Volatility",
};

type MoverTab = "Gainers" | "Losers";

const MarketsBoard: React.FC = () => {
  const [tab, setTab] = useState<string>("Indices");
  const [moverTab, setMoverTab] = useState<MoverTab>("Gainers");
  const [movers, setMovers] = useState<Quote[]>([]);
  const { quotes, loading } = useQuotes(TABS[tab], 30000);

  useEffect(() => {
    let alive = true;
    fetch(`/api/market/movers?list=${moverTab.toLowerCase()}`)
      .then((r) => r.json())
      .then((d) => { if (alive && Array.isArray(d)) setMovers(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, [moverTab]);

  return (
    <section className="relative w-screen text-white bg-night py-16 md:py-20" style={{ marginLeft: "calc(-50vw + 50%)" }}>
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="flex items-end justify-between mb-8">
          <div>
            <CommandLine cmd="WEI" note="world equity indices" className="mb-4" />
            <h2 className="font-display text-ivory text-4xl md:text-5xl tracking-tight">
              Markets today
            </h2>
          </div>
          <Link
            href="/terminal"
            className="hidden sm:inline-flex items-center gap-2 font-monodata text-xs uppercase tracking-wider text-gray-400 hover:text-gold transition-colors"
          >
            Open Terminal <span>→</span>
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main quotes table */}
          <div className="lg:col-span-2 card-night overflow-hidden">
            <div className="flex gap-1 p-3 border-b border-white/5 overflow-x-auto">
              {Object.keys(TABS).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                    tab === t
                      ? "bg-yellow-400/15 text-yellow-300 border border-yellow-400/30"
                      : "text-gray-500 hover:text-gray-300 border border-transparent"
                  }`}>
                  {t}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 text-[11px] uppercase tracking-wider">
                    <th className="px-5 py-3 font-semibold">Symbol</th>
                    <th className="px-5 py-3 font-semibold text-right">Price</th>
                    <th className="px-5 py-3 font-semibold text-right">Change</th>
                    <th className="px-5 py-3 font-semibold text-right hidden md:table-cell">% Chg</th>
                    <th className="px-5 py-3 font-semibold text-right hidden lg:table-cell">Mkt Cap / Vol</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && quotes.length === 0
                    ? [...Array(8)].map((_, i) => (
                        <tr key={i} className="border-t border-white/5">
                          <td colSpan={5} className="px-5 py-3">
                            <div className="h-6 rounded bg-white/[0.04] animate-pulse" />
                          </td>
                        </tr>
                      ))
                    : quotes.map((q) => {
                        const up = (q.changePercent || 0) >= 0;
                        return (
                          <tr key={q.symbol} className="border-t border-white/5 hover:bg-white/[0.03] transition-colors">
                            <td className="px-5 py-3.5">
                              <Link href={`/terminal?symbol=${encodeURIComponent(q.symbol)}`} className="group">
                                <span className="font-bold text-white group-hover:text-yellow-300 transition-colors">
                                  {q.symbol.replace("^", "")}
                                </span>
                                <span className="block text-xs text-gray-500 truncate max-w-[220px]">
                                  {NAME_OVERRIDES[q.symbol] || q.name}
                                </span>
                              </Link>
                            </td>
                            <td className="px-5 py-3.5 text-right font-mono tabular-nums text-gray-100">
                              ${fmtPrice(q.price)}
                            </td>
                            <td className={`px-5 py-3.5 text-right font-mono tabular-nums font-semibold ${up ? "text-green-400" : "text-red-400"}`}>
                              {up ? "+" : ""}{(q.change ?? 0).toFixed(2)}
                            </td>
                            <td className={`px-5 py-3.5 text-right hidden md:table-cell`}>
                              <span className={`inline-block min-w-[74px] text-center px-2 py-1 rounded-md font-mono text-xs font-bold ${
                                up ? "text-green-400 bg-green-500/10" : "text-red-400 bg-red-500/10"
                              }`}>
                                {up ? "▲" : "▼"} {Math.abs(q.changePercent || 0).toFixed(2)}%
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-right font-mono tabular-nums text-gray-400 hidden lg:table-cell">
                              {q.marketCap ? fmtCap(q.marketCap) : q.volume ? `${fmtCap(q.volume)} vol` : "—"}
                            </td>
                          </tr>
                        );
                      })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Movers sidebar */}
          <div className="card-night overflow-hidden">
            <div className="flex gap-1 p-3 border-b border-white/5">
              {(["Gainers", "Losers"] as MoverTab[]).map((t) => (
                <button key={t} onClick={() => setMoverTab(t)}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    moverTab === t
                      ? t === "Gainers"
                        ? "bg-green-500/15 text-green-400 border border-green-500/30"
                        : "bg-red-500/15 text-red-400 border border-red-500/30"
                      : "text-gray-500 hover:text-gray-300 border border-transparent"
                  }`}>
                  {t === "Gainers" ? "▲ Gainers" : "▼ Losers"}
                </button>
              ))}
            </div>
            <div className="p-2">
              {movers.length === 0
                ? [...Array(8)].map((_, i) => (
                    <div key={i} className="h-[46px] m-1 rounded-lg bg-white/[0.03] animate-pulse" />
                  ))
                : movers.slice(0, 9).map((m) => {
                    const up = (m.changePercent || 0) >= 0;
                    return (
                      <Link key={m.symbol} href={`/terminal?symbol=${encodeURIComponent(m.symbol)}`}
                        className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors">
                        <div className="min-w-0 mr-3">
                          <span className="font-bold text-white text-sm">{m.symbol}</span>
                          <span className="block text-[11px] text-gray-500 truncate max-w-[140px]">{m.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="block font-mono tabular-nums text-gray-100 text-sm">${fmtPrice(m.price)}</span>
                          <span className={`font-mono tabular-nums text-[11px] font-bold ${up ? "text-green-400" : "text-red-400"}`}>
                            {up ? "+" : ""}{(m.changePercent || 0).toFixed(2)}%
                          </span>
                        </div>
                      </Link>
                    );
                  })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MarketsBoard;
