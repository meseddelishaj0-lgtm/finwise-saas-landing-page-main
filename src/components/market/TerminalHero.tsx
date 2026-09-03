"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuotes, fmtPrice, Quote } from "./useQuotes";
import AppStoreButton from "@/components/AppStoreButton";
import CommandLine from "@/components/ui/CommandLine";

/**
 * Landing masthead. The signature: the S&P 500's real intraday line draws
 * itself across the full width of the hero on load, with the live price
 * riding at its end. Everything else stays quiet around it.
 */

const STRIP = ["^GSPC", "^IXIC", "^DJI", "^RUT", "BTCUSD", "^VIX"];

const NAMES: Record<string, string> = {
  "^GSPC": "S&P 500",
  "^IXIC": "Nasdaq",
  "^DJI": "Dow Jones",
  "^RUT": "Russell 2000",
  "^VIX": "VIX",
  BTCUSD: "Bitcoin",
};

interface Bar {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

// Intraday bars for the tape; refreshes every 60s without re-running the draw.
function useIntraday(symbol: string) {
  const [bars, setBars] = useState<Bar[]>([]);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch(`/api/market/chart?symbol=${encodeURIComponent(symbol)}&range=1D`)
        .then((r) => r.json())
        .then((d) => {
          if (alive && Array.isArray(d) && d.length > 5) setBars(d);
        })
        .catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [symbol]);
  return bars;
}

const VB_W = 1000;
const VB_H = 300;
const PAD_TOP = 36;
const PAD_BOTTOM = 34;

function sessionLabel(lastT?: string) {
  if (!lastT) return "today";
  const barDate = lastT.slice(0, 10);
  const todayET = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return barDate === todayET ? "today" : "last session";
}

const HeroTape: React.FC<{ bars: Bar[]; quote?: Quote }> = ({ bars, quote }) => {
  const geo = useMemo(() => {
    if (bars.length < 2) return null;
    const closes = bars.map((b) => b.c);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const span = max - min || 1;
    const usable = VB_H - PAD_TOP - PAD_BOTTOM;
    const pts = closes.map((c, i) => {
      const x = (i / (closes.length - 1)) * VB_W;
      const y = PAD_TOP + (1 - (c - min) / span) * usable;
      return [x, y] as const;
    });
    const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
    const area = `${line} L${VB_W},${VB_H} L0,${VB_H} Z`;
    const [, lastY] = pts[pts.length - 1];
    const [, firstY] = pts[0];
    return { line, area, lastYPct: (lastY / VB_H) * 100, firstYPct: (firstY / VB_H) * 100 };
  }, [bars]);

  if (!geo) return null;

  const up = (quote?.changePercent ?? 0) >= 0;
  const last = bars[bars.length - 1];

  return (
    <div className="absolute inset-x-0 bottom-0 h-60 sm:h-[44%] lg:h-[56%] pointer-events-none select-none" aria-hidden="true">
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          <linearGradient id="wss-hero-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FACC15" stopOpacity="0.22" />
            <stop offset="55%" stopColor="#FACC15" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#FACC15" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="wss-hero-stroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FACC15" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#FACC15" stopOpacity="1" />
          </linearGradient>
        </defs>
        <path d={geo.area} fill="url(#wss-hero-fill)" className="fade-late" />
        <path
          d={geo.line}
          fill="none"
          stroke="url(#wss-hero-stroke)"
          strokeWidth="1.75"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          pathLength={1}
          className="draw-line"
        />
      </svg>

      {/* Start label */}
      <div
        className="absolute left-4 md:left-10 fade-late eyebrow text-gold/70"
        style={{ top: `calc(${geo.firstYPct}% - 26px)` }}
      >
        S&amp;P 500 · {sessionLabel(last?.t)}
      </div>

      {/* Live marker + price pill at the line's end */}
      <div className="absolute right-0" style={{ top: `${geo.lastYPct}%` }}>
        <span className="live-dot absolute right-0 -translate-y-1/2 translate-x-1/2 fade-later" />
        <div className="absolute right-4 -translate-y-1/2 fade-later">
          <div className="flex items-center gap-2.5 rounded-full border border-gold/40 bg-night/90 backdrop-blur px-3.5 py-1.5 font-monodata text-xs whitespace-nowrap shadow-[0_10px_30px_-12px_rgba(250,204,21,0.45)]">
            <span className="text-ivory tabular-nums font-semibold">
              {fmtPrice(quote?.price ?? last?.c)}
            </span>
            {quote && (
              <span className={`tabular-nums font-semibold ${up ? "text-green-400" : "text-red-400"}`}>
                {up ? "▲" : "▼"} {Math.abs(quote.changePercent || 0).toFixed(2)}%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const TerminalHero: React.FC = () => {
  const bars = useIntraday("^GSPC");
  const { quotes, loading } = useQuotes(STRIP, 30_000);
  const spx = quotes.find((q) => q.symbol === "^GSPC");

  return (
    <section className="relative w-full overflow-hidden bg-night text-white border-b border-white/10">
      {/* Masthead */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pt-12 md:pt-16 lg:pt-20 pb-64 sm:pb-56 lg:pb-64">
        <div className="max-w-3xl">
          <div className="rise" style={{ "--d": "0s" } as React.CSSProperties}>
            <CommandLine cmd="OPEN" note="session live · real-time data" />
          </div>

          <h1
            className="rise mt-7 font-display text-ivory text-[2.75rem] leading-[1.02] sm:text-6xl lg:text-7xl xl:text-[5rem] tracking-tight"
            style={{ "--d": "0.08s" } as React.CSSProperties}
          >
            The market,
            <br />
            on <em className="italic text-gold-soft">your</em> terms.
          </h1>

          <p
            className="rise mt-6 text-lg md:text-xl max-w-xl text-gray-300 leading-relaxed"
            style={{ "--d": "0.16s" } as React.CSSProperties}
          >
            Live quotes, AI research, and a pro-grade terminal — the whole desk,
            without the desk job.
          </p>

          <div
            className="rise mt-9 flex flex-col sm:flex-row items-start sm:items-center gap-4"
            style={{ "--d": "0.24s" } as React.CSSProperties}
          >
            <Link href="/terminal" className="group btn-gold px-8 py-3.5 text-base">
              Open the Terminal
              <span className="arrow">→</span>
            </Link>
            <Link href="/register" className="btn-ghost-gold px-8 py-3.5 text-base">
              Start free
            </Link>
            <div className="sm:ml-2">
              <AppStoreButton />
            </div>
          </div>

          <p
            className="rise mt-10 eyebrow text-gray-500 hidden sm:block"
            style={{ "--d": "0.34s" } as React.CSSProperties}
          >
            Equities · ETFs · Indices · Crypto · Forex · Commodities
          </p>
        </div>
      </div>

      {/* The tape — full-bleed, behind the masthead */}
      <HeroTape bars={bars} quote={spx} />

      {/* Live index strip */}
      <div
        className="rise relative z-10 border-t border-white/10 bg-night/85 backdrop-blur-sm"
        style={{ "--d": "0.5s" } as React.CSSProperties}
      >
        <div className="max-w-7xl mx-auto md:px-10">
          <div className="flex overflow-x-auto snap-x snap-mandatory md:grid md:grid-cols-3 lg:grid-cols-6 md:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {STRIP.map((sym, i) => {
              const q = quotes.find((x) => x.symbol === sym);
              const up = (q?.changePercent ?? 0) >= 0;
              return (
                <Link
                  key={sym}
                  href={`/terminal?symbol=${encodeURIComponent(sym)}`}
                  className={`group snap-start flex-shrink-0 w-[46vw] sm:w-[34vw] md:w-auto px-6 md:px-5 py-4 md:py-5 border-r border-white/10 last:border-r-0 md:[&:nth-child(3)]:border-r-0 lg:[&:nth-child(3)]:border-r md:[&:nth-child(-n+3)]:border-b lg:[&:nth-child(-n+3)]:border-b-0 hover:bg-white/[0.03] transition-colors ${
                    i === 0 ? "md:border-l-0" : ""
                  }`}
                >
                  <span className="eyebrow block group-hover:text-gold transition-colors">
                    {NAMES[sym] ?? sym}
                  </span>
                  {loading && !q ? (
                    <span className="mt-2 block h-6 w-24 rounded bg-white/[0.05] animate-pulse" />
                  ) : (
                    <span className="mt-1.5 flex items-baseline gap-2.5 font-monodata">
                      <span className="text-ivory text-lg tabular-nums">{fmtPrice(q?.price)}</span>
                      <span className={`text-xs font-semibold tabular-nums ${up ? "text-green-400" : "text-red-400"}`}>
                        {q ? `${up ? "+" : ""}${(q.changePercent || 0).toFixed(2)}%` : "—"}
                      </span>
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TerminalHero;
