"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import TranscriptsTab from "@/components/market/fundamentals/TranscriptsTab";
import ProfileTab from "@/components/market/fundamentals/ProfileTab";
import CommandBar from "@/components/market/functions/CommandBar";
import HelpOverlay from "@/components/market/functions/HelpOverlay";
import MarketClock from "@/components/market/functions/MarketClock";
import { FUNCTIONS, FnDef, findFn } from "@/components/market/functions/registry";
import HistoricalPrices from "@/components/market/functions/HistoricalPrices";
import CompareChart from "@/components/market/functions/CompareChart";
import Technicals from "@/components/market/functions/Technicals";
import RelativeValue from "@/components/market/functions/RelativeValue";
import NewsPanel from "@/components/market/functions/NewsPanel";
import FxMatrix from "@/components/market/functions/FxMatrix";
import YieldCurve from "@/components/market/functions/YieldCurve";
import { WorldIndices, FuturesBoard, MostActive, SectorBoard } from "@/components/market/functions/MarketBoards";
import { EcoCalendar, EarningsCalendar, IpoCalendar } from "@/components/market/functions/Calendars";

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

/* ---------------- function workspace ---------------- */

// Panels that render in the workspace. GP scrolls to the chart and the
// href functions (HMAP, EQS) navigate, so neither appears here.
const PANEL_CODES = FUNCTIONS.filter((f) => f.code !== "GP" && !f.href).map((f) => f.code);

interface PanelProps {
  symbol: string;
  quote?: Quote;
  go: (s: string) => void;
}

const renderPanel = (code: string, { symbol, quote, go }: PanelProps): React.ReactNode => {
  switch (code) {
    case "DES": return <ProfileTab symbol={symbol} quote={quote} />;
    case "FA": return <FinancialsTab symbol={symbol} quote={quote} />;
    case "ANR": return <AnalystsTab symbol={symbol} quote={quote} />;
    case "HDS": return <OwnershipTab symbol={symbol} quote={quote} />;
    case "ERN": return <EarningsTab symbol={symbol} quote={quote} />;
    case "TRAN": return <TranscriptsTab symbol={symbol} quote={quote} />;
    case "RV": return <RelativeValue symbol={symbol} onSelect={go} />;
    case "HP": return <HistoricalPrices symbol={symbol} />;
    case "COMP": return <CompareChart symbol={symbol} onSelect={go} />;
    case "TECH": return <Technicals symbol={symbol} />;
    case "CN": return <NewsPanel symbol={symbol} onSelect={go} />;
    case "WEI": return <WorldIndices onSelect={go} />;
    case "MOST": return <MostActive onSelect={go} />;
    case "IMAP": return <SectorBoard onSelect={go} />;
    case "FXC": return <FxMatrix onSelect={go} />;
    case "CMDTY": return <FuturesBoard onSelect={go} />;
    case "GC": return <YieldCurve />;
    case "ECO": return <EcoCalendar />;
    case "EVTS": return <EarningsCalendar onSelect={go} />;
    case "IPO": return <IpoCalendar onSelect={go} />;
    case "TOP": return <NewsPanel onSelect={go} />;
    default: return null;
  }
};

const FunctionWorkspace: React.FC<{
  symbol: string;
  quote?: Quote;
  fn: string;
  hasFundamentals: boolean;
  profileLoading: boolean;
  onPick: (f: FnDef) => void;
  go: (s: string) => void;
}> = ({ symbol, quote, fn, hasFundamentals, profileLoading, onPick, go }) => {
  // Keep visited panels mounted (hidden) so flipping back doesn't refetch.
  // Security panels are keyed by symbol; market panels survive symbol changes.
  const [visited, setVisited] = useState<string[]>([]);
  useEffect(() => {
    setVisited((v) => (v.includes(fn) ? v : [...v, fn]));
  }, [fn]);

  const def = findFn(fn);
  const blocked = def?.equityOnly && !hasFundamentals && !profileLoading;

  const strip = (scope: "security" | "market") =>
    FUNCTIONS.filter((f) => f.scope === scope).map((f) => {
      const disabled = f.equityOnly && !hasFundamentals && !profileLoading;
      return (
        <button
          key={f.code}
          onClick={() => onPick(f)}
          disabled={disabled}
          title={`${f.name} — ${f.desc}`}
          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-black tracking-wider whitespace-nowrap transition-colors ${
            fn === f.code
              ? "bg-yellow-400 text-black"
              : disabled
              ? "text-gray-700 cursor-not-allowed"
              : "text-gray-400 hover:text-yellow-300 hover:bg-white/[0.04]"
          }`}
        >
          {f.code}
          {f.href ? " ↗" : ""}
        </button>
      );
    });

  return (
    <div className="mt-4">
      <div className="rounded-2xl border border-white/10 bg-surface p-1.5 flex flex-col xl:flex-row xl:items-center gap-1.5">
        <div className="flex items-center gap-0.5 overflow-x-auto">
          <span className="px-2 text-[9px] font-bold uppercase tracking-widest text-gray-600 whitespace-nowrap">{symbol.replace("^", "")}</span>
          {strip("security")}
        </div>
        <span className="hidden xl:block w-px h-6 bg-white/10 mx-1" />
        <div className="flex items-center gap-0.5 overflow-x-auto">
          <span className="px-2 text-[9px] font-bold uppercase tracking-widest text-gray-600 whitespace-nowrap">Markets</span>
          {strip("market")}
        </div>
      </div>

      <div className="mt-4">
        {blocked ? (
          <div className="rounded-2xl border border-white/10 bg-surface">
            <EmptyNote text={`${def?.name} covers companies — ${symbol.replace("^", "")} has no company fundamentals. Try HP, COMP, TECH or CN.`} />
          </div>
        ) : def?.equityOnly && profileLoading ? (
          <div className="rounded-2xl border border-white/10 bg-surface">
            <Skeleton rows={6} />
          </div>
        ) : null}
        {visited
          .filter((code) => PANEL_CODES.includes(code))
          .map((code) => {
            const f = findFn(code)!;
            if (f.equityOnly && !hasFundamentals) return null;
            const key = f.scope === "security" ? `${symbol}-${code}` : code;
            return (
              <div key={key} className={fn === code && !blocked ? "" : "hidden"}>
                {renderPanel(code, { symbol, quote, go })}
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
  const fnParam = (params.get("fn") || "").toUpperCase();
  const [helpOpen, setHelpOpen] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

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

  const hasFundamentals = !!profile?.symbol;
  // No fn in the URL → Financials for companies, Technicals for everything else.
  const fnDef = findFn(fnParam);
  const fn = fnDef && fnDef.code !== "GP" && !fnDef.href ? fnDef.code : profileLoading || hasFundamentals ? "FA" : "TECH";

  const navigate = useCallback(
    (sym: string, code?: string) => {
      const clean = sym.trim().toUpperCase().replace(/[^A-Z0-9^./-]/g, "");
      if (!clean) return;
      const q = new URLSearchParams({ symbol: clean });
      if (code) q.set("fn", code);
      router.push(`/terminal?${q.toString()}`, { scroll: false });
    },
    [router]
  );

  // Loading a new security keeps the current function when it applies.
  const go = (s: string) => navigate(s, fnParam && findFn(fnParam)?.scope === "security" ? fnParam : undefined);

  const runFn = (sym: string | undefined, f: FnDef | undefined) => {
    if (f?.href) {
      router.push(f.href);
      return;
    }
    const target = sym || symbol;
    if (f?.code === "GP" || !f) {
      if (!f) go(target);
      else navigate(target, fnParam || undefined);
      chartRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    navigate(target, f.code);
    setTimeout(() => document.getElementById("fn-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };

  // "?" opens the directory; Alt+←/→ steps through functions.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "?") {
        e.preventDefault();
        setHelpOpen(true);
      } else if (e.altKey && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
        const list = FUNCTIONS.filter((f) => f.code !== "GP" && !f.href && (!f.equityOnly || hasFundamentals));
        const i = list.findIndex((f) => f.code === fn);
        const next = list[(i + (e.key === "ArrowRight" ? 1 : -1) + list.length) % list.length];
        e.preventDefault();
        navigate(symbol, next.code);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fn, hasFundamentals, navigate, symbol]);

  const inWatchlist = watchlist.includes(symbol);

  return (
    <main className="min-h-screen bg-night text-white pt-6 pb-10 px-4 md:px-6">
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
            <MarketClock />
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

        {/* Command line */}
        <div className="mb-4">
          <CommandBar symbol={symbol} onRun={runFn} onHelp={() => setHelpOpen(true)} />
        </div>
        {helpOpen && (
          <HelpOverlay
            onClose={() => setHelpOpen(false)}
            onPick={(f) => {
              setHelpOpen(false);
              runFn(undefined, f);
            }}
          />
        )}

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
          <div ref={chartRef} className="rounded-2xl border border-white/10 bg-surface overflow-hidden order-1 lg:order-2 scroll-mt-4">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <div>
                <span className="font-mono font-bold">{symbol.replace("^", "")}</span>
                <span className="ml-2 text-xs text-gray-500">{q?.name || ""}</span>
              </div>
              <span className="text-[10px] text-gray-600 font-mono">GP · WSS Charts</span>
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

        {/* Function workspace — security + market functions */}
        <div id="fn-workspace" className="scroll-mt-4">
          <FunctionWorkspace
            symbol={symbol}
            quote={q}
            fn={fn}
            hasFundamentals={hasFundamentals}
            profileLoading={profileLoading}
            onPick={(f) => runFn(undefined, f)}
            go={go}
          />
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
    <Suspense fallback={<main className="min-h-screen bg-night" />}>
      <TerminalInner />
    </Suspense>
  );
}
