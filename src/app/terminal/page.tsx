"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuotes, Quote } from "@/components/market/useQuotes";
import TerminalChart from "@/components/market/TerminalChart";
import SymbolSearch from "@/components/market/SymbolSearch";
import MarketsPanel from "@/components/market/MarketsPanel";
import { useDataset, Skeleton, EmptyNote } from "@/components/market/fundamentals/shared";
import SymbolHeader from "@/components/market/fundamentals/SymbolHeader";
import OverviewPanel from "@/components/market/fundamentals/OverviewPanel";
import FinancialsTab from "@/components/market/fundamentals/FinancialsTab";
import AnalystsTab from "@/components/market/fundamentals/AnalystsTab";
import OwnershipTab from "@/components/market/fundamentals/OwnershipTab";
import EarningsTab from "@/components/market/fundamentals/EarningsTab";
import ProfileTab from "@/components/market/fundamentals/ProfileTab";

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

/* ---------------- fundamentals tab section ---------------- */

const FUND_TABS = [
  { key: "financials", label: "Financials", C: FinancialsTab },
  { key: "analysts", label: "Analysts", C: AnalystsTab },
  { key: "ownership", label: "Ownership", C: OwnershipTab },
  { key: "earnings", label: "Earnings & Dividends", C: EarningsTab },
  { key: "profile", label: "Profile", C: ProfileTab },
] as const;

type FundTabKey = (typeof FUND_TABS)[number]["key"];

const FundamentalsSection: React.FC<{
  symbol: string;
  quote?: Quote;
  profile: any;
  profileLoading: boolean;
}> = ({ symbol, quote, profile, profileLoading }) => {
  const [tab, setTab] = useState<FundTabKey>("financials");
  const [visited, setVisited] = useState<Set<FundTabKey>>(new Set(["financials"]));

  // New symbol → only mount the active tab again
  useEffect(() => {
    setVisited(new Set([tab]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  const pick = (k: FundTabKey) => {
    setTab(k);
    setVisited((v) => new Set(v).add(k));
  };

  if (profileLoading && !profile) {
    return (
      <div className="mt-4 rounded-2xl border border-white/10 bg-surface">
        <Skeleton rows={4} />
      </div>
    );
  }

  // Indices, crypto, forex & commodities have no fundamentals — hide the suite.
  if (!profile?.symbol) return null;

  return (
    <div className="mt-4">
      <div className="flex items-center gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-surface p-1.5">
        {FUND_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => pick(t.key)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
              tab === t.key
                ? "bg-yellow-400/15 text-yellow-300"
                : "text-gray-500 hover:text-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
        <span className="ml-auto hidden md:inline pr-3 text-[10px] font-mono text-gray-600 whitespace-nowrap">
          {symbol.replace("^", "")} · FUNDAMENTALS
        </span>
      </div>

      <div className="mt-4">
        {FUND_TABS.filter((t) => visited.has(t.key)).map((t) => {
          const C = t.C;
          return (
            <div key={`${symbol}-${t.key}`} className={tab === t.key ? "" : "hidden"}>
              <C symbol={symbol} quote={quote} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ---------------------- page ---------------------- */

function TerminalInner() {
  const router = useRouter();
  const params = useSearchParams();
  const symbol = (params.get("symbol") || "NVDA").toUpperCase();

  const [watchlist, setWatchlist] = useState<string[]>(DEFAULT_WATCHLIST);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [rightTab, setRightTab] = useState<"overview" | "news">("overview");

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

  const symbolArr = useMemo(() => [symbol], [symbol]);
  const { quotes: symQuotes } = useQuotes(symbolArr, 30000);
  const q: Quote | undefined = symQuotes[0];

  const { data: profile, loading: profileLoading } = useDataset<any>(symbol, "profile");

  // Symbol news
  useEffect(() => {
    let alive = true;
    setNews([]);
    setNewsLoading(true);
    fetch(`/api/market/news?symbol=${encodeURIComponent(symbol.replace("^", ""))}`)
      .then((r) => r.json())
      .then((d) => { if (alive && Array.isArray(d)) setNews(d); })
      .catch(() => {})
      .finally(() => { if (alive) setNewsLoading(false); });
    return () => { alive = false; };
  }, [symbol]);

  const go = (s: string) => {
    const clean = s.trim().toUpperCase().replace(/[^A-Z0-9^./-]/g, "");
    if (clean) router.push(`/terminal?symbol=${encodeURIComponent(clean)}`);
  };

  const inWatchlist = watchlist.includes(symbol);

  return (
    <main className="min-h-screen bg-night text-white pt-24 pb-10 px-4 md:px-6">
      <div className="max-w-[1600px] mx-auto">
        {/* Terminal top bar */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-yellow-500/20 bg-surface px-4 py-3 mb-4">
          <div className="flex items-center gap-2 mr-1">
            <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
            <span className="font-mono text-xs text-gray-400 tracking-widest hidden sm:inline">TERMINAL</span>
          </div>

          <div className="flex-1 min-w-[200px] max-w-xs">
            <SymbolSearch variant="terminal" />
          </div>

          <div className="hidden md:flex items-center gap-1.5">
            {["NVDA", "SPY", "QQQ", "BTCUSD", "TSLA"].map((s) => (
              <button key={s} onClick={() => go(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
                  s === symbol ? "bg-yellow-400/15 text-yellow-300 border border-yellow-400/30" : "text-gray-500 hover:text-gray-200 border border-white/10"
                }`}>
                {s}
              </button>
            ))}
            <Link href="/heatmap"
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-400 border border-white/10 hover:text-yellow-300 hover:border-yellow-400/40 transition-colors">
              🗺️ Heatmap
            </Link>
            <Link href="/screener"
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-400 border border-white/10 hover:text-yellow-300 hover:border-yellow-400/40 transition-colors">
              ⚙️ Screener
            </Link>
          </div>

          <div className="ml-auto flex items-center gap-3">
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

        {/* Company identity strip — keyed so per-symbol state (broken logo) resets */}
        <div className="mb-4">
          <SymbolHeader key={symbol} symbol={symbol} quote={q} profile={profile} loading={profileLoading} />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[290px_1fr_300px] gap-4">
          {/* Watchlist + Markets browser */}
          <div className="order-2 lg:order-1">
            <MarketsPanel
              activeSymbol={symbol}
              watchlist={watchlist}
              onSelect={go}
              onToggleWatch={(s) =>
                persist(watchlist.includes(s) ? watchlist.filter((w) => w !== s) : [...watchlist, s])
              }
            />
          </div>

          {/* Chart — our own engine, Twelve Data + FMP */}
          <div className="rounded-2xl border border-white/10 bg-surface overflow-hidden order-1 lg:order-2">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <div>
                <span className="font-mono font-bold">{symbol.replace("^", "")}</span>
                <span className="ml-2 text-xs text-gray-500">{q?.name || ""}</span>
              </div>
              <span className="text-[10px] text-gray-600 font-mono">WSS Charts</span>
            </div>
            <TerminalChart symbol={symbol} prevClose={q?.previousClose} height={460} />
          </div>

          {/* Right panel */}
          <div className="rounded-2xl border border-white/10 bg-surface overflow-hidden order-3">
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
              <OverviewPanel symbol={symbol} quote={q} profile={profile} />
            ) : (
              <div className="p-2 max-h-[70vh] overflow-y-auto">
                {news.length === 0 ? (
                  newsLoading ? (
                    <Skeleton rows={8} />
                  ) : (
                    <EmptyNote text="No recent news for this symbol." />
                  )
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

        {/* Fundamentals suite — statements, analysts, ownership, earnings, profile */}
        <FundamentalsSection
          symbol={symbol}
          quote={q}
          profile={profile}
          profileLoading={profileLoading}
        />

        <p className="text-center text-[11px] text-gray-600 mt-6">
          Market data delayed or real-time depending on source. For informational purposes only — not financial advice.
        </p>
      </div>
    </main>
  );
}

export default function TerminalPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-night" />}>
      <TerminalInner />
    </Suspense>
  );
}
