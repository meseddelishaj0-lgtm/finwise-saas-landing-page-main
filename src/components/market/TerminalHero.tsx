"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuotes, fmtPrice } from "./useQuotes";
import AppStoreButton from "@/components/AppStoreButton";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.12 * i, duration: 0.7, ease: [0.22, 1, 0.36, 1] },
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
    <section className="relative w-screen overflow-hidden text-white bg-night" style={{ marginLeft: "calc(-50vw + 50%)" }}>
      {/* Backdrop: terminal grid + gold glow */}
      <div
        className="absolute inset-0 opacity-[0.13]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,215,0,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(255,215,0,0.25) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />
      <div className="section-glow" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pt-20 pb-16 md:pt-28 md:pb-24 grid lg:grid-cols-2 gap-14 items-center">
        {/* Left: headline */}
        <div>
          <motion.div custom={0} initial="hidden" animate="visible" variants={fadeUp}
            className="badge-pill mb-6 inline-flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
            </span>
            <span className="tracking-wide">Live Markets · Real-Time Data</span>
          </motion.div>

          <motion.h1 custom={1} initial="hidden" animate="visible" variants={fadeUp}
            className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.05]
            bg-gradient-to-r from-yellow-400 via-amber-200 to-yellow-500 bg-clip-text text-transparent
            drop-shadow-[0_0_45px_rgba(255,215,0,0.25)]">
            The Market,
            <br />
            On Your Terms.
          </motion.h1>

          <motion.p custom={2} initial="hidden" animate="visible" variants={fadeUp}
            className="mt-6 text-lg md:text-xl max-w-xl text-gray-300 leading-relaxed">
            Real-time quotes, AI research, and a pro-grade trading terminal —
            everything serious investors need, in one place.
          </motion.p>

          <motion.div custom={3} initial="hidden" animate="visible" variants={fadeUp}
            className="mt-9 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Link href="/terminal"
              className="group btn-gold px-8 py-3.5 text-base">
              Open Trading Terminal
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
            <Link href="/register"
              className="btn-ghost-gold px-8 py-3.5 text-base">
              Get Started Free
            </Link>
          </motion.div>

          <motion.div custom={4} initial="hidden" animate="visible" variants={fadeUp} className="mt-6">
            <AppStoreButton />
          </motion.div>
        </div>

        {/* Right: live terminal window */}
        <motion.div custom={2} initial="hidden" animate="visible" variants={fadeUp}
          className="card-night overflow-hidden">
          {/* Window chrome */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
              <span className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
              <span className="w-3 h-3 rounded-full bg-[#28C840]" />
            </div>
            <span className="font-mono text-xs text-gray-500">wallstreetstocks · live feed</span>
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> LIVE
            </span>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-3 pt-3">
            {(Object.keys(TABS) as (keyof typeof TABS)[]).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  tab === t
                    ? "bg-yellow-400/15 text-yellow-300 border border-yellow-400/30"
                    : "text-gray-500 hover:text-gray-300 border border-transparent"
                }`}>
                {t}
              </button>
            ))}
          </div>

          {/* Quote rows */}
          <div className="p-3 font-mono text-sm min-h-[280px]">
            {loading && quotes.length === 0 ? (
              <div className="space-y-2 pt-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-[46px] rounded-lg bg-white/[0.03] animate-pulse" />
                ))}
              </div>
            ) : (
              quotes.map((q) => {
                const up = (q.changePercent || 0) >= 0;
                return (
                  <Link key={q.symbol} href={`/terminal?symbol=${encodeURIComponent(q.symbol)}`}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors">
                    <div className="min-w-0">
                      <span className="text-white font-bold">{q.symbol.replace("^", "")}</span>
                      <span className="ml-2 text-gray-500 text-xs truncate">
                        {NAME_OVERRIDES[q.symbol] || q.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-100 tabular-nums">${fmtPrice(q.price)}</span>
                      <span className={`tabular-nums text-xs font-bold px-2 py-0.5 rounded ${
                        up ? "text-green-400 bg-green-500/10" : "text-red-400 bg-red-500/10"
                      }`}>
                        {up ? "▲" : "▼"} {Math.abs(q.changePercent || 0).toFixed(2)}%
                      </span>
                    </div>
                  </Link>
                );
              })
            )}
            <div className="px-3 pt-2 text-[11px] text-gray-500">
              <span className="text-yellow-500/70">$</span> streaming quotes · refreshed every 30s
              <span className="inline-block w-1.5 h-3 ml-1 bg-yellow-400/80 animate-pulse align-middle" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TerminalHero;
