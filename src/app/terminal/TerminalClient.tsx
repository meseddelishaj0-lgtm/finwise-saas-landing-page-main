"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuotes, Quote } from "@/components/market/useQuotes";
import { useLiveStatus, toStream } from "@/components/market/live";
import TerminalChart from "@/components/market/TerminalChart";
import SymbolSearch from "@/components/market/SymbolSearch";
import MarketsPanel from "@/components/market/MarketsPanel";
import { useDataset, Skeleton, EmptyNote } from "@/components/market/fundamentals/shared";
import SymbolHeader from "@/components/market/fundamentals/SymbolHeader";
import OverviewPanel from "@/components/market/fundamentals/OverviewPanel";
import CommandBar from "@/components/market/functions/CommandBar";
import HelpOverlay from "@/components/market/functions/HelpOverlay";
import MarketClock from "@/components/market/functions/MarketClock";
import { FUNCTIONS, FnDef, findFn } from "@/components/market/functions/registry";
import { PANEL_CODES, renderPanel } from "@/components/market/functions/panels";
import { MacroStrip } from "@/components/market/functions/Workbench";

const DEFAULT_WATCHLIST = ["NVDA", "AAPL", "MSFT", "META", "TSLA", "AMZN", "SPY", "BTCUSD"];
const WATCHLIST_KEY = "wss_terminal_watchlist";
const WORKSPACE_KEY = "wss_terminal_workspace";

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

const cleanSym = (s: string) => s.trim().toUpperCase().replace(/[^A-Z0-9^./-]/g, "").slice(0, 12);

const popOut = (symbol: string, fn: string) => {
  const q = new URLSearchParams({ symbol, fn });
  window.open(`/terminal/pop?${q.toString()}`, `wss-${fn}-${Date.now()}`, "popup,width=1180,height=820");
};

/* ---------------- workspace: extra panes + saved layouts ---------------- */

interface Pane {
  fn: string;
  /** Empty = follows the terminal's loaded security. */
  symbol: string;
}
interface Workspace {
  count: number;
  panes: Pane[];
  saved: Record<string, { count: number; primary: string; panes: Pane[] }>;
}
const DEFAULT_PANES: Pane[] = [
  { fn: "CN", symbol: "" },
  { fn: "GLOBE", symbol: "" },
  { fn: "WEI", symbol: "" },
];
const PANE_CODES = ["GP", ...PANEL_CODES];

const loadWorkspace = (): Workspace => {
  const base: Workspace = { count: 1, panes: DEFAULT_PANES, saved: {} };
  try {
    const w = JSON.parse(localStorage.getItem(WORKSPACE_KEY) || "null");
    if (!w) return base;
    const panes = (Array.isArray(w.panes) ? w.panes : [])
      .filter((p: Pane) => p && PANE_CODES.includes(p.fn))
      .map((p: Pane) => ({ fn: p.fn, symbol: cleanSym(String(p.symbol ?? "")) }));
    return {
      count: [1, 2, 3, 4].includes(w.count) ? w.count : 1,
      panes: [...panes, ...DEFAULT_PANES].slice(0, 3),
      saved: w.saved && typeof w.saved === "object" ? w.saved : {},
    };
  } catch {
    return base;
  }
};

const ExtraPane: React.FC<{
  pane: Pane;
  mainSymbol: string;
  mainQuote?: Quote;
  onChange: (p: Pane) => void;
  onClose: () => void;
  go: (s: string) => void;
  run: (symbol: string | undefined, fn: string) => void;
}> = ({ pane, mainSymbol, mainQuote, onChange, onClose, go, run }) => {
  const [draft, setDraft] = useState(pane.symbol);
  useEffect(() => setDraft(pane.symbol), [pane.symbol]);
  const symbol = pane.symbol || mainSymbol;
  const def = findFn(pane.fn);
  const commit = () => {
    const s = cleanSym(draft);
    if (s !== pane.symbol) onChange({ ...pane, symbol: s });
  };
  const btn = "w-7 h-7 grid place-items-center rounded-md text-gray-500 hover:text-yellow-300 hover:bg-white/[0.05] text-xs";

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2 mb-1.5 px-1">
        <select
          value={pane.fn}
          onChange={(e) => onChange({ ...pane, fn: e.target.value })}
          aria-label="Pane function"
          className="bg-surface border border-white/10 rounded-md px-2 py-1 font-mono text-[11px] font-bold text-yellow-300 outline-none focus:border-yellow-400/50"
        >
          {(["security", "market"] as const).map((scope) => (
            <optgroup key={scope} label={scope === "security" ? "Security" : "Markets"}>
              {FUNCTIONS.filter((f) => f.scope === scope && !f.href).map((f) => (
                <option key={f.code} value={f.code}>{f.code} — {f.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
        {def?.scope === "security" && (
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value.toUpperCase())}
            onBlur={commit}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            placeholder={`${mainSymbol.replace("^", "")} (linked)`}
            aria-label="Pane security; leave empty to follow the loaded security"
            spellCheck={false}
            className="w-32 bg-surface border border-white/10 rounded-md px-2 py-1 font-mono text-[11px] text-gray-100 placeholder-gray-600 outline-none focus:border-yellow-400/50"
          />
        )}
        <span className="flex-1" />
        <button className={btn} onClick={() => popOut(symbol, pane.fn)} title="Open in its own window" aria-label="Open pane in its own window">⧉</button>
        <button className={btn} onClick={onClose} title="Close pane" aria-label="Close pane">✕</button>
      </div>
      {/* Keyed so a pane swaps cleanly when its function or security changes */}
      <div key={`${pane.fn}-${def?.scope === "security" ? symbol : ""}`}>
        {renderPanel(pane.fn, {
          symbol,
          quote: symbol === mainSymbol ? mainQuote : undefined,
          // A pinned pane navigates itself; a linked pane drives the terminal.
          go: pane.symbol ? (s) => onChange({ ...pane, symbol: cleanSym(s) }) : go,
          run,
        })}
      </div>
    </div>
  );
};

/* ---------------- function workspace ---------------- */

const FunctionWorkspace: React.FC<{
  symbol: string;
  quote?: Quote;
  fn: string;
  hasFundamentals: boolean;
  profileLoading: boolean;
  onPick: (f: FnDef) => void;
  go: (s: string) => void;
  run: (symbol: string | undefined, fn: string) => void;
  ask: { q: string; nonce: number } | null;
  ws: Workspace;
  setWs: (w: Workspace) => void;
}> = ({ symbol, quote, fn, hasFundamentals, profileLoading, onPick, go, run, ask, ws, setWs }) => {
  // Keep visited panels mounted (hidden) so flipping back doesn't refetch.
  // Security panels are keyed by symbol; market panels survive symbol changes.
  const [visited, setVisited] = useState<string[]>([]);
  useEffect(() => {
    setVisited((v) => (v.includes(fn) ? v : [...v, fn]));
  }, [fn]);
  const [saving, setSaving] = useState(false);
  const [layoutName, setLayoutName] = useState("");

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

  const savedNames = Object.keys(ws.saved);
  const saveLayout = () => {
    const name = layoutName.trim().slice(0, 24);
    if (!name) return;
    setWs({ ...ws, saved: { ...ws.saved, [name]: { count: ws.count, primary: fn, panes: ws.panes } } });
    setLayoutName("");
    setSaving(false);
  };
  const applyLayout = (name: string) => {
    const l = ws.saved[name];
    if (!l) return;
    setWs({ ...ws, count: l.count, panes: l.panes });
    const f = findFn(l.primary);
    if (f) onPick(f);
  };
  const small = "px-2.5 py-1 rounded-lg border border-white/10 text-[11px] font-mono font-bold text-gray-400 hover:text-yellow-300 hover:border-yellow-400/40 transition-colors";

  return (
    <div className="mt-4">
      <div className="rounded-2xl border border-white/10 bg-surface p-1.5 flex flex-col gap-1.5">
        <div className="flex items-center gap-0.5 overflow-x-auto">
          <span className="w-16 shrink-0 px-2 text-[9px] font-bold uppercase tracking-widest text-gray-600 whitespace-nowrap truncate">{symbol.replace("^", "")}</span>
          {strip("security")}
        </div>
        <div className="flex items-center gap-0.5 overflow-x-auto border-t border-white/5 pt-1.5">
          <span className="w-16 shrink-0 px-2 text-[9px] font-bold uppercase tracking-widest text-gray-600 whitespace-nowrap">Markets</span>
          {strip("market")}
        </div>
      </div>

      {/* Workspace bar: pane count, saved layouts, pop-out */}
      <div className="mt-2 flex flex-wrap items-center gap-2 px-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Panes</span>
        <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg border border-white/10">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              onClick={() => setWs({ ...ws, count: n })}
              aria-pressed={ws.count === n}
              title={`${n} pane${n > 1 ? "s" : ""} (key ${n})`}
              className={`w-7 py-1 rounded-md text-[11px] font-mono font-bold transition-colors ${ws.count === n ? "bg-yellow-400/15 text-yellow-300" : "text-gray-500 hover:text-gray-200"}`}
            >
              {n}
            </button>
          ))}
        </div>
        {savedNames.length > 0 && (
          <select
            value=""
            onChange={(e) => e.target.value && applyLayout(e.target.value)}
            aria-label="Load a saved layout"
            className="bg-surface border border-white/10 rounded-lg px-2 py-1 text-[11px] font-mono text-gray-300 outline-none"
          >
            <option value="">Layouts…</option>
            {savedNames.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        )}
        {saving ? (
          <form onSubmit={(e) => { e.preventDefault(); saveLayout(); }} className="flex items-center gap-1.5">
            <input
              autoFocus
              value={layoutName}
              onChange={(e) => setLayoutName(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setSaving(false)}
              placeholder="Layout name"
              aria-label="Layout name"
              maxLength={24}
              className="w-36 bg-surface border border-yellow-400/40 rounded-lg px-2 py-1 text-[11px] text-gray-100 placeholder-gray-600 outline-none"
            />
            <button type="submit" className="px-2.5 py-1 rounded-lg bg-yellow-400 text-black text-[11px] font-black">Save</button>
            <button type="button" onClick={() => setSaving(false)} className={small}>Cancel</button>
          </form>
        ) : (
          <button onClick={() => setSaving(true)} className={small}>Save layout</button>
        )}
        {savedNames.length > 0 && !saving && (
          <button
            onClick={() => {
              const next = { ...ws.saved };
              delete next[savedNames[savedNames.length - 1]];
              setWs({ ...ws, saved: next });
            }}
            className={small}
            title={`Delete saved layout “${savedNames[savedNames.length - 1]}”`}
          >
            Delete “{savedNames[savedNames.length - 1]}”
          </button>
        )}
        <span className="flex-1" />
        <button onClick={() => popOut(symbol, fn)} className={small} title="Open this panel in its own window (P)">⧉ Pop out</button>
      </div>

      <div className={`mt-3 grid grid-cols-1 gap-4 items-start ${ws.count > 1 ? "xl:grid-cols-2" : ""}`}>
        <div id="fn-primary" className="min-w-0">
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
                  {renderPanel(code, { symbol, quote, go, run, ask })}
                </div>
              );
            })}
        </div>

        {ws.panes.slice(0, ws.count - 1).map((pane, i) => (
          <ExtraPane
            key={i}
            pane={pane}
            mainSymbol={symbol}
            mainQuote={quote}
            go={go}
            run={run}
            onChange={(p) => setWs({ ...ws, panes: ws.panes.map((x, j) => (j === i ? p : x)) })}
            onClose={() => {
              // Drop this pane and shrink the layout by one.
              const rest = ws.panes.filter((_, j) => j !== i);
              setWs({ ...ws, count: ws.count - 1, panes: [...rest, pane] });
            }}
          />
        ))}
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
  const [ask, setAsk] = useState<{ q: string; nonce: number } | null>(null);
  const [ws, setWsState] = useState<Workspace>({ count: 1, panes: DEFAULT_PANES, saved: {} });

  // Watchlist + workspace persistence
  useEffect(() => {
    try {
      const saved = localStorage.getItem(WATCHLIST_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) setWatchlist(parsed);
      }
    } catch {}
    setWsState(loadWorkspace());
  }, []);
  const persist = (list: string[]) => {
    setWatchlist(list);
    try { localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list)); } catch {}
  };
  const setWs = useCallback((w: Workspace) => {
    setWsState(w);
    try { localStorage.setItem(WORKSPACE_KEY, JSON.stringify(w)); } catch {}
  }, []);

  const symbolArr = useMemo(() => [symbol], [symbol]);
  const { quotes: symQuotes } = useQuotes(symbolArr, 30000, true);
  const q: Quote | undefined = symQuotes[0];
  const streaming = useLiveStatus();

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
      const clean = cleanSym(sym);
      if (!clean) return;
      const q = new URLSearchParams({ symbol: clean });
      if (code) q.set("fn", code);
      router.push(`/terminal?${q.toString()}`, { scroll: false });
    },
    [router]
  );

  // Loading a new security keeps the current function when it applies.
  const go = (s: string) => navigate(s, fnParam && findFn(fnParam)?.scope === "security" ? fnParam : undefined);

  const toWorkspace = () =>
    setTimeout(() => document.getElementById("fn-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);

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
    toWorkspace();
  };
  const run = (sym: string | undefined, code: string) => runFn(sym, findFn(code));

  const onAsk = (question: string) => {
    setAsk({ q: question, nonce: Date.now() });
    navigate(symbol, "ASK");
    toWorkspace();
  };

  // Hotkeys: ? directory · Alt+←/→ step functions · 1–4 panes · P pop out ·
  // E export CSV · G globe.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (e.key === "?") {
        e.preventDefault();
        setHelpOpen(true);
      } else if (e.altKey && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
        const list = FUNCTIONS.filter((f) => f.code !== "GP" && !f.href && (!f.equityOnly || hasFundamentals));
        const i = list.findIndex((f) => f.code === fn);
        const next = list[(i + (e.key === "ArrowRight" ? 1 : -1) + list.length) % list.length];
        e.preventDefault();
        navigate(symbol, next.code);
      } else if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      } else if (["1", "2", "3", "4"].includes(e.key)) {
        setWs({ ...ws, count: Number(e.key) });
      } else if (e.key === "p" || e.key === "P") {
        popOut(symbol, fn);
      } else if (e.key === "e" || e.key === "E") {
        const btn = Array.from(document.querySelectorAll<HTMLButtonElement>("#fn-primary [data-export-csv]")).find((b) => b.offsetParent !== null);
        btn?.click();
      } else if (e.key === "g" || e.key === "G") {
        navigate(symbol, "GLOBE");
        toWorkspace();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fn, hasFundamentals, navigate, symbol, ws, setWs]);

  const inWatchlist = watchlist.includes(symbol);
  const live = streaming && !!toStream(symbol);

  return (
    <main className="min-h-screen bg-night text-white pt-6 pb-10 px-4 md:px-6">
      <div className="max-w-[1600px] mx-auto">
        {/* Terminal top bar */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-yellow-500/20 bg-surface px-4 py-3 mb-4">
          <div className="flex items-center gap-2 mr-1" title={live ? "Streaming live prices" : "Prices refresh every 30 seconds"}>
            <span className={`w-2.5 h-2.5 rounded-full ${live ? "bg-green-400 animate-pulse" : "bg-yellow-400"}`} />
            <span className="font-mono text-xs text-gray-400 tracking-widest hidden sm:inline">{live ? "LIVE" : "TERMINAL"}</span>
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
            <span className="w-px h-5 bg-white/10 mx-1" />
            {["ASK", "GLOBE", "PORT", "ALRT"].map((code) => (
              <button key={code} onClick={() => run(undefined, code)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors ${
                  fn === code ? "bg-yellow-400 text-black border-yellow-400" : "text-yellow-300 border-yellow-400/30 hover:bg-yellow-400/10"
                }`}>
                {code}
              </button>
            ))}
            <Link href="/heatmap"
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-gray-400 border border-white/10 hover:text-yellow-300 hover:border-yellow-400/40 transition-colors">
              HMAP
            </Link>
            <Link href="/screener"
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-gray-400 border border-white/10 hover:text-yellow-300 hover:border-yellow-400/40 transition-colors">
              EQS
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

        {/* Macro line — futures, energy, metals, dollar, rates */}
        <div className="mb-4">
          <MacroStrip onSelect={go} active={symbol} />
        </div>

        {/* Command line */}
        <div className="mb-4">
          <CommandBar symbol={symbol} onRun={runFn} onHelp={() => setHelpOpen(true)} onAsk={onAsk} />
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

        {/* Function workspace — security + market functions, up to four panes */}
        <div id="fn-workspace" className="scroll-mt-4">
          <FunctionWorkspace
            symbol={symbol}
            quote={q}
            fn={fn}
            hasFundamentals={hasFundamentals}
            profileLoading={profileLoading}
            onPick={(f) => runFn(undefined, f)}
            go={go}
            run={run}
            ask={ask}
            ws={ws}
            setWs={setWs}
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
