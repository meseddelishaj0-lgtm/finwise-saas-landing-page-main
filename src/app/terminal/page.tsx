"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuotes, fmtPrice, fmtCap, Quote } from "@/components/market/useQuotes";

const DEFAULT_WATCHLIST = ["NVDA", "AAPL", "MSFT", "META", "TSLA", "AMZN", "SPY", "BTCUSD"];
const WATCHLIST_KEY = "wss_terminal_watchlist";

interface NewsItem {
  symbol?: string;
  title: string;
  site: string;
  url: string;
  publishedDate: string;
}

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr.replace(" ", "T")).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
};

// Map our symbols to something TradingView resolves cleanly
const tvSymbol = (s: string) => {
  const up = s.toUpperCase();
  if (up.startsWith("^")) {
    const map: Record<string, string> = {
      "^GSPC": "FOREXCOM:SPXUSD", "^IXIC": "NASDAQ:IXIC", "^DJI": "FOREXCOM:DJI",
      "^RUT": "FOREXCOM:RTYUSD", "^VIX": "TVC:VIX",
    };
    return map[up] || up.replace("^", "");
  }
  if (up.endsWith("USD") && up.length <= 8 && !up.includes(":")) return `BITSTAMP:${up}`;
  return up;
};

function TerminalInner() {
  const router = useRouter();
  const params = useSearchParams();
  const symbol = (params.get("symbol") || "NVDA").toUpperCase();

  const [search, setSearch] = useState("");
  const [watchlist, setWatchlist] = useState<string[]>(DEFAULT_WATCHLIST);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [rightTab, setRightTab] = useState<"overview" | "news">("overview");
  const chartRef = useRef<HTMLDivElement>(null);

  // Watchlist persistence
  useEffect(() => {
    try {
      const saved = localStorage.getItem(WATCHLIST_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) setWatchlist(parsed);
      }
    } catch {}
  }, []);
  const persist = (list: string[]) => {
    setWatchlist(list);
    try { localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list)); } catch {}
  };

  const { quotes: watchQuotes } = useQuotes(watchlist, 30000);
  const symbolArr = useMemo(() => [symbol], [symbol]);
  const { quotes: symQuotes } = useQuotes(symbolArr, 30000);
  const q: Quote | undefined = symQuotes[0];

  // TradingView advanced chart
  const loadChart = useCallback(() => {
    if (!chartRef.current) return;
    chartRef.current.innerHTML = "";
    const container = document.createElement("div");
    container.id = "tv_terminal_chart";
    container.style.height = "100%";
    chartRef.current.appendChild(container);

    const init = () => {
      // @ts-ignore
      if (typeof TradingView === "undefined") return;
      // @ts-ignore
      new TradingView.widget({
        autosize: true,
        symbol: tvSymbol(symbol),
        interval: "D",
        timezone: "America/New_York",
        theme: "dark",
        style: "1",
        locale: "en",
        toolbar_bg: "#0b0b09",
        enable_publishing: false,
        allow_symbol_change: false,
        hide_side_toolbar: false,
        container_id: "tv_terminal_chart",
      });
    };

    const existing = document.getElementById("tv-lib-script");
    if (existing) {
      init();
    } else {
      const script = document.createElement("script");
      script.id = "tv-lib-script";
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      script.onload = init;
      document.body.appendChild(script);
    }
  }, [symbol]);

  useEffect(() => {
    const t = setTimeout(loadChart, 50);
    return () => clearTimeout(t);
  }, [loadChart]);

  // Symbol news
  useEffect(() => {
    let alive = true;
    setNews([]);
    fetch(`/api/market/news?symbol=${encodeURIComponent(symbol.replace("^", ""))}`)
      .then((r) => r.json())
      .then((d) => { if (alive && Array.isArray(d)) setNews(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, [symbol]);

  const go = (s: string) => {
    const clean = s.trim().toUpperCase().replace(/[^A-Z0-9^./-]/g, "");
    if (clean) router.push(`/terminal?symbol=${encodeURIComponent(clean)}`);
  };

  const inWatchlist = watchlist.includes(symbol);
  const up = (q?.changePercent || 0) >= 0;

  return (
    <main className="min-h-screen bg-black text-white pt-24 pb-10 px-4 md:px-6">
      <div className="max-w-[1600px] mx-auto">
        {/* Terminal top bar */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-yellow-500/20 bg-[#0b0b09] px-4 py-3 mb-4">
          <div className="flex items-center gap-2 mr-1">
            <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
            <span className="font-mono text-xs text-gray-400 tracking-widest hidden sm:inline">TERMINAL</span>
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); go(search); setSearch(""); }}
            className="flex items-center gap-2 flex-1 min-w-[180px] max-w-xs bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 focus-within:border-yellow-400/50 transition-colors">
            <span className="text-gray-500 text-sm">🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Symbol… (e.g. NVDA)"
              className="bg-transparent outline-none text-sm font-mono uppercase placeholder:normal-case placeholder:font-sans w-full"
            />
          </form>

          <div className="hidden md:flex items-center gap-1.5">
            {["NVDA", "SPY", "QQQ", "BTCUSD", "TSLA"].map((s) => (
              <button key={s} onClick={() => go(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
                  s === symbol ? "bg-yellow-400/15 text-yellow-300 border border-yellow-400/30" : "text-gray-500 hover:text-gray-200 border border-white/10"
                }`}>
                {s}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-4">
            {q && (
              <div className="text-right">
                <span className="font-mono font-bold text-lg tabular-nums">${fmtPrice(q.price)}</span>
                <span className={`ml-2 font-mono text-sm font-bold ${up ? "text-green-400" : "text-red-400"}`}>
                  {up ? "▲" : "▼"} {Math.abs(q.changePercent || 0).toFixed(2)}%
                </span>
              </div>
            )}
            <button
              onClick={() => persist(inWatchlist ? watchlist.filter((s) => s !== symbol) : [...watchlist, symbol])}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                inWatchlist
                  ? "text-yellow-300 bg-yellow-400/10 border-yellow-400/40"
                  : "text-gray-400 border-white/15 hover:text-yellow-300 hover:border-yellow-400/40"
              }`}>
              {inWatchlist ? "★ Watching" : "☆ Watch"}
            </button>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_300px] gap-4">
          {/* Watchlist */}
          <div className="rounded-2xl border border-white/10 bg-[#0b0b09] overflow-hidden order-2 lg:order-1">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-bold text-sm">Watchlist</h3>
              <span className="text-[10px] text-gray-600 font-mono">30s</span>
            </div>
            <div className="p-1.5 max-h-[70vh] overflow-y-auto">
              {watchQuotes.length === 0
                ? [...Array(8)].map((_, i) => (
                    <div key={i} className="h-[52px] m-1 rounded-lg bg-white/[0.03] animate-pulse" />
                  ))
                : watchQuotes.map((w) => {
                    const wUp = (w.changePercent || 0) >= 0;
                    const active = w.symbol === symbol;
                    return (
                      <button key={w.symbol} onClick={() => go(w.symbol)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${
                          active ? "bg-yellow-400/10 border border-yellow-400/25" : "hover:bg-white/[0.04] border border-transparent"
                        }`}>
                        <div>
                          <span className={`font-mono font-bold text-sm ${active ? "text-yellow-300" : "text-white"}`}>
                            {w.symbol.replace("^", "")}
                          </span>
                          <span className={`block font-mono text-[11px] tabular-nums ${wUp ? "text-green-400" : "text-red-400"}`}>
                            {wUp ? "+" : ""}{(w.changePercent || 0).toFixed(2)}%
                          </span>
                        </div>
                        <span className="font-mono text-sm tabular-nums text-gray-200">${fmtPrice(w.price)}</span>
                      </button>
                    );
                  })}
            </div>
          </div>

          {/* Chart */}
          <div className="rounded-2xl border border-white/10 bg-[#0b0b09] overflow-hidden order-1 lg:order-2">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <div>
                <span className="font-mono font-bold">{symbol.replace("^", "")}</span>
                <span className="ml-2 text-xs text-gray-500">{q?.name || ""}</span>
              </div>
              <span className="text-[10px] text-gray-600 font-mono">Chart by TradingView</span>
            </div>
            <div ref={chartRef} className="h-[420px] md:h-[560px]" />
          </div>

          {/* Right panel */}
          <div className="rounded-2xl border border-white/10 bg-[#0b0b09] overflow-hidden order-3">
            <div className="flex gap-1 p-2 border-b border-white/5">
              {(["overview", "news"] as const).map((t) => (
                <button key={t} onClick={() => setRightTab(t)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                    rightTab === t ? "bg-yellow-400/15 text-yellow-300" : "text-gray-500 hover:text-gray-300"
                  }`}>
                  {t}
                </button>
              ))}
            </div>

            {rightTab === "overview" ? (
              <div className="p-4 space-y-3">
                {([
                  ["Previous Close", q?.previousClose != null ? `$${fmtPrice(q.previousClose)}` : "—"],
                  ["Day Range", q?.dayLow != null ? `$${fmtPrice(q.dayLow)} – $${fmtPrice(q.dayHigh)}` : "—"],
                  ["52W Range", q?.yearLow != null ? `$${fmtPrice(q.yearLow)} – $${fmtPrice(q.yearHigh)}` : "—"],
                  ["Market Cap", q?.marketCap ? `$${fmtCap(q.marketCap)}` : "—"],
                  ["Volume", q?.volume ? fmtCap(q.volume) : "—"],
                  ["P/E", q?.pe ? q.pe.toFixed(1) : "—"],
                ] as [string, string][]).map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <span className="text-xs text-gray-500">{label}</span>
                    <span className="font-mono text-sm tabular-nums text-gray-100">{value}</span>
                  </div>
                ))}
                <Link href="/register"
                  className="block text-center mt-4 px-4 py-2.5 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-400 text-black text-sm font-bold hover:scale-[1.02] transition-transform">
                  Unlock AI Research →
                </Link>
              </div>
            ) : (
              <div className="p-2 max-h-[70vh] overflow-y-auto">
                {news.length === 0 ? (
                  <p className="text-center text-gray-600 text-sm py-8">Loading news…</p>
                ) : (
                  news.map((n, i) => (
                    <a key={i} href={n.url} target="_blank" rel="noopener noreferrer"
                      className="block px-3 py-3 rounded-lg hover:bg-white/[0.04] transition-colors border-b border-white/5">
                      <p className="text-sm font-medium leading-snug line-clamp-3">{n.title}</p>
                      <span className="block mt-1 text-[11px] text-gray-500">{n.site} · {timeAgo(n.publishedDate)} ago</span>
                    </a>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-[11px] text-gray-600 mt-6">
          Market data delayed or real-time depending on source. For informational purposes only — not financial advice.
        </p>
      </div>
    </main>
  );
}

export default function TerminalPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-black" />}>
      <TerminalInner />
    </Suspense>
  );
}
