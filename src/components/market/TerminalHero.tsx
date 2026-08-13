"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuotes, fmtPrice } from "./useQuotes";
import AppStoreButton from "@/components/AppStoreButton";
import CommandLine from "@/components/ui/CommandLine";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.12 * i, duration: 0.65, ease: [0.22, 1, 0.36, 1] },
  }),
};

const TABS: Record<string, string[]> = {
  Indices: ["^GSPC", "^IXIC", "^DJI", "^RUT", "^VIX"],
  Crypto: ["BTCUSD", "ETHUSD", "SOLUSD", "XRPUSD", "DOGEUSD"],
  "Mega Caps": ["NVDA", "AAPL", "MSFT", "META", "TSLA"],
};

const NAME_OVERRIDES: Record<string, string> = {
  "^GSPC": "S&P 500",
  "^IXIC": "NASDAQ",
  "^DJI": "Dow Jones",
  "^RUT": "Russell 2000",
  "^VIX": "VIX",
  BTCUSD: "Bitcoin",
  ETHUSD: "Ethereum",
  SOLUSD: "Solana",
  XRPUSD: "XRP",
  DOGEUSD: "Dogecoin",
};

const TerminalHero: React.FC = () => {
  const [tab, setTab] = useState<keyof typeof TABS>("Indices");
  const { quotes, loading } = useQuotes(TABS[tab]);

  return (
    <section
      className="relative w-screen overflow-hidden text-white bg-night border-b border-white/10"
      style={{ marginLeft: "calc(-50vw + 50%)" }}
    >
      <div className="relative max-w-7xl mx-auto px-6 md:px-10 pt-14 pb-16 md:pt-20 md:pb-24 grid lg:grid-cols-[1.05fr_0.95fr] gap-14 items-center">
        {/* Left: masthead */}
        <div>
          <motion.div custom={0} initial="hidden" animate="visible" variants={fadeUp}>
            <CommandLine cmd="OPEN" note="session live · real-time data" />
          </motion.div>

          <motion.h1
            custom={1}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mt-7 font-display text-ivory text-5xl md:text-7xl leading-[1.02] tracking-tight"
          >
            The market,
            <br />
            on <em className="italic text-gold-soft">your</em> terms.
          </motion.h1>

          <motion.p
            custom={2}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mt-6 text-lg md:text-xl max-w-xl text-gray-400 leading-relaxed"
          >
            Live quotes, AI research, and a pro-grade terminal — the whole
            desk, without the desk job.
          </motion.p>

          <motion.div
            custom={3}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mt-9 flex flex-col sm:flex-row items-start sm:items-center gap-4"
          >
            <Link href="/terminal" className="group btn-gold px-8 py-3.5 text-base">
              Open the Terminal
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
            <Link href="/register" className="btn-ghost-gold px-8 py-3.5 text-base">
              Start free
            </Link>
          </motion.div>

          <motion.div custom={4} initial="hidden" animate="visible" variants={fadeUp} className="mt-6">
            <AppStoreButton />
          </motion.div>

          {/* Statusline */}
          <motion.p
            custom={5}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mt-10 font-monodata text-[11px] md:text-xs text-gray-500 tracking-wider uppercase"
          >
            Equities · ETFs · Indices · Crypto · Forex · Commodities
          </motion.p>
        </div>

        {/* Right: live terminal pane */}
        <motion.div
          custom={2}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="rounded-xl border border-white/10 bg-surface overflow-hidden"
        >
          {/* Pane header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <span className="font-monodata text-[11px] tracking-widest text-gray-500 uppercase">
              WallStreetStocks — live feed
            </span>
            <span className="flex items-center gap-1.5 font-monodata text-[11px] font-semibold text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> LIVE
            </span>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-3 pt-3">
            {(Object.keys(TABS) as (keyof typeof TABS)[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3.5 py-1.5 rounded-md font-monodata text-[11px] uppercase tracking-wider transition-colors ${
                  tab === t
                    ? "bg-yellow-400/10 text-gold border border-yellow-400/30"
                    : "text-gray-500 hover:text-gray-300 border border-transparent"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Quote rows */}
          <div className="p-3 font-monodata text-sm min-h-[280px]">
            {loading && quotes.length === 0 ? (
              <div className="space-y-2 pt-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-[46px] rounded-md bg-white/[0.03] animate-pulse" />
                ))}
              </div>
            ) : (
              quotes.map((q) => {
                const up = (q.changePercent || 0) >= 0;
                return (
                  <Link
                    key={q.symbol}
                    href={`/terminal?symbol=${encodeURIComponent(q.symbol)}`}
                    className="flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="min-w-0">
                      <span className="text-ivory font-semibold">{q.symbol.replace("^", "")}</span>
                      <span className="ml-2 text-gray-500 text-xs truncate">
                        {NAME_OVERRIDES[q.symbol] || q.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-100 tabular-nums">${fmtPrice(q.price)}</span>
                      <span
                        className={`tabular-nums text-xs font-semibold px-2 py-0.5 rounded ${
                          up ? "text-green-400 bg-green-500/10" : "text-red-400 bg-red-500/10"
                        }`}
                      >
                        {up ? "▲" : "▼"} {Math.abs(q.changePercent || 0).toFixed(2)}%
                      </span>
                    </div>
                  </Link>
                );
              })
            )}
            <div className="px-3 pt-2 text-[11px] text-gray-500">
              <span className="text-gold/70">$</span> streaming quotes · refreshed every 30s
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TerminalHero;
