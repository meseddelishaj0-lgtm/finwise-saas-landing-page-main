"use client";

// ASK (plain-English questions), ETF (holdings and overlap), FIL (filings +
// quarter brief), DVDC / SPLT (dividend and split calendars), MNA (deals),
// ALRT (account price alerts).

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FnPanel, Pills, Loading, Empty, useJson, th, td, fmtP, fmtPctS, fmtBig, tone, isNum } from "./ui";
import { findFn } from "./registry";

const shortDate = (s: string) => {
  const d = new Date(`${s.slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};
const dayLabel = (s: string) => {
  const d = new Date(`${s.slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
};

/* --------------------------- AI answers --------------------------- */

interface Panel {
  fn: string;
  symbol?: string;
}
export type RunPanel = (symbol: string | undefined, fn: string) => void;

/** Renders the model's light markdown: paragraphs, "- " bullets, **bold**. */
export const Answer: React.FC<{ text: string }> = ({ text }) => {
  const bold = (s: string, k: number) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={`${k}-${i}`} className="font-semibold text-gray-50">{part.slice(2, -2)}</strong>
      ) : (
        <React.Fragment key={`${k}-${i}`}>{part}</React.Fragment>
      )
    );
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (!bullets.length) return;
    const items = bullets;
    bullets = [];
    blocks.push(
      <ul key={`u${blocks.length}`} className="space-y-1.5 my-2">
        {items.map((b, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-yellow-400 select-none">+</span>
            <span>{bold(b, i)}</span>
          </li>
        ))}
      </ul>
    );
  };
  text.split("\n").forEach((line, i) => {
    const t = line.trim();
    if (/^[-*•]\s+/.test(t)) bullets.push(t.replace(/^[-*•]\s+/, ""));
    else {
      flush();
      if (t) blocks.push(<p key={`p${i}`} className="my-2">{bold(t.replace(/^#+\s*/, ""), i)}</p>);
    }
  });
  flush();
  return <div className="text-sm text-gray-300 leading-relaxed max-w-[72ch]">{blocks}</div>;
};

async function askApi(body: Record<string, unknown>): Promise<{ answer: string; panels: Panel[] }> {
  const r = await fetch("/api/market/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => null);
  if (r.status === 429) throw new Error("You're asking faster than the limit allows. Wait a minute and try again.");
  if (!r.ok || !d?.answer) throw new Error(d?.error || "The AI service did not respond. Try again in a moment.");
  return { answer: d.answer, panels: Array.isArray(d.panels) ? d.panels : [] };
}

const PanelChips: React.FC<{ panels: Panel[]; onRun: RunPanel }> = ({ panels, onRun }) =>
  panels.length ? (
    <div className="flex flex-wrap gap-1.5 mt-3">
      {panels.map((p, i) => (
        <button
          key={i}
          onClick={() => onRun(p.symbol, p.fn)}
          className="px-2.5 py-1.5 rounded-lg border border-yellow-400/30 text-[11px] font-mono font-bold text-yellow-300 hover:bg-yellow-400/10 transition-colors"
          title={findFn(p.fn)?.name}
        >
          {p.symbol ? `${p.symbol.replace("^", "")} ` : ""}{p.fn} <span className="font-sans font-normal text-gray-400">{findFn(p.fn)?.name}</span>
        </button>
      ))}
    </div>
  ) : null;

interface Turn {
  id: number;
  q: string;
  a?: string;
  panels?: Panel[];
  error?: string;
}

const STARTERS = [
  "What moved oil and gold today?",
  "Compare NVDA and AMD margins over the last 3 years",
  "How has the S&P 500 done year to date versus Europe and Japan?",
  "Is inflation rising or falling, and where is the Fed funds rate?",
];

export const AskPanel: React.FC<{ symbol: string; onRun: RunPanel; pending?: { q: string; nonce: number } | null }> = ({ symbol, onRun, pending }) => {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const turnsRef = useRef<Turn[]>([]);
  turnsRef.current = turns;

  const ask = useCallback(
    async (q: string) => {
      const question = q.trim();
      if (!question || busy) return;
      setBusy(true);
      setDraft("");
      const history = turnsRef.current
        .filter((t) => t.a)
        .slice(-3)
        .flatMap((t) => [{ role: "user", content: t.q }, { role: "assistant", content: t.a! }]);
      const id = Date.now() + Math.random();
      setTurns((t) => [...t, { id, q: question }]);
      try {
        const out = await askApi({ mode: "ask", question, symbol, history });
        setTurns((t) => t.map((x) => (x.id === id ? { ...x, a: out.answer, panels: out.panels } : x)));
      } catch (e) {
        setTurns((t) => t.map((x) => (x.id === id ? { ...x, error: (e as Error).message } : x)));
      } finally {
        setBusy(false);
      }
    },
    [busy, symbol]
  );

  // A question typed into the command line arrives here. The ref makes each
  // hand-over run once even if the effect fires again for the same question.
  const nonce = pending?.nonce;
  const handled = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!pending?.q || handled.current === nonce) return;
    handled.current = nonce;
    ask(pending.q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [turns, busy]);

  return (
    <FnPanel
      code="ASK"
      title="Ask the Terminal"
      subtitle="Plain-English questions, answered from live terminal data"
      right={turns.length ? <button onClick={() => setTurns([])} className="px-2.5 py-1 rounded-lg border border-white/10 text-[11px] text-gray-400 hover:text-yellow-300">Clear</button> : undefined}
    >
      <div className="p-4 md:p-5">
        {!turns.length && (
          <div className="mb-4">
            <p className="text-sm text-gray-400 mb-3">
              Ask about a company, a comparison or the market. Answers use the same quotes, financials, news and macro data as the panels, and link to the panel behind each one.
            </p>
            <div className="flex flex-wrap gap-2">
              {[`What changed in ${symbol.replace("^", "")}'s latest quarter?`, ...STARTERS].map((s) => (
                <button key={s} onClick={() => ask(s)} className="px-3 py-2 rounded-lg border border-white/10 text-xs text-gray-300 hover:border-yellow-400/40 hover:text-yellow-200 text-left transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-5">
          {turns.map((t, i) => (
            <div key={i}>
              <p className="font-mono text-xs text-yellow-300"><span className="text-gray-600">&gt; </span>{t.q}</p>
              {t.a ? (
                <div className="mt-1.5 pl-3 border-l border-yellow-400/25">
                  <Answer text={t.a} />
                  <PanelChips panels={t.panels ?? []} onRun={onRun} />
                </div>
              ) : t.error ? (
                <p className="mt-2 text-sm text-red-400" role="alert">{t.error}</p>
              ) : (
                <p className="mt-2 text-xs font-mono text-gray-500 animate-pulse">Pulling data…</p>
              )}
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(draft);
          }}
          className="mt-5 flex gap-2"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={600}
            placeholder="Ask a question…"
            aria-label="Question"
            className="flex-1 min-w-0 px-3 py-2.5 rounded-lg bg-night border border-white/10 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-yellow-400/50"
          />
          <button type="submit" disabled={busy || !draft.trim()} className="px-4 py-2 rounded-lg bg-yellow-400 text-black text-xs font-black disabled:opacity-40 hover:bg-yellow-300 transition-colors">
            {busy ? "Working…" : "Ask"}
          </button>
        </form>
        <p className="mt-2 text-[10px] text-gray-600">AI-generated from terminal data and can be wrong. Check the linked panels. Not financial advice.</p>
      </div>
    </FnPanel>
  );
};

/** One-question box used on the transcripts tab. */
export const TranscriptAsk: React.FC<{ symbol: string; year: number; quarter: number }> = ({ symbol, year, quarter }) => {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<{ q: string; a?: string; error?: string } | null>(null);
  useEffect(() => setOut(null), [symbol, year, quarter]);

  const ask = async (question: string) => {
    if (!question.trim() || busy) return;
    setBusy(true);
    setOut({ q: question });
    try {
      const r = await askApi({ mode: "transcript", symbol, year, quarter, question });
      setOut({ q: question, a: r.answer });
    } catch (e) {
      setOut({ q: question, error: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-4 rounded-xl border border-yellow-400/20 bg-yellow-400/[0.03] p-3">
      <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={500}
          placeholder={`Ask about the Q${quarter} ${year} call — e.g. what did management say about margins?`}
          aria-label="Question about this earnings call"
          className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-night border border-white/10 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-yellow-400/50"
        />
        <button type="submit" disabled={busy || !q.trim()} className="px-3 py-2 rounded-lg bg-yellow-400 text-black text-xs font-black disabled:opacity-40">
          {busy ? "Reading…" : "Ask"}
        </button>
      </form>
      {!out && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {["Summarize the call in five points", "What guidance was given?", "What were analysts most concerned about?"].map((s) => (
            <button key={s} onClick={() => { setQ(s); ask(s); }} className="px-2 py-1 rounded-md border border-white/10 text-[11px] text-gray-400 hover:text-yellow-200 hover:border-yellow-400/40">{s}</button>
          ))}
        </div>
      )}
      {out && (
        <div className="mt-3">
          {out.a ? <Answer text={out.a} /> : out.error ? <p className="text-sm text-red-400" role="alert">{out.error}</p> : <p className="text-xs font-mono text-gray-500 animate-pulse">Reading the transcript…</p>}
          {out.a && <p className="mt-1 text-[10px] text-gray-600">AI-generated from this transcript; verify against the text below.</p>}
        </div>
      )}
    </div>
  );
};

/* ------------------------------- ETF ------------------------------- */

interface EtfData {
  symbol: string;
  name: string | null;
  description: string | null;
  aum: number | null;
  expenseRatio: number | null;
  inception: string | null;
  issuer: string | null;
  holdingsCount: number;
  top10: number;
  holdings: { asset: string; name: string; weight: number; value: number | null }[];
  sectors: { name: string; weight: number }[];
  countries: { name: string; weight: number }[];
  overlap: null | { vs: string; error?: string; weight?: number; count?: number; ofA?: number; ofB?: number; top?: { asset: string; name: string; a: number; b: number }[] };
}

const WeightBars: React.FC<{ title: string; rows: { name: string; weight: number }[] }> = ({ title, rows }) =>
  rows.length ? (
    <div className="p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-yellow-300 mb-2">{title}</p>
      <div className="space-y-1.5">
        {rows.slice(0, 10).map((r) => (
          <div key={r.name} className="grid grid-cols-[minmax(0,1fr)_90px_48px] items-center gap-2 text-xs">
            <span className="text-gray-300 truncate">{r.name}</span>
            <span className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <span className="block h-full bg-yellow-400" style={{ width: `${Math.min(100, (r.weight / rows[0].weight) * 100)}%` }} />
            </span>
            <span className="font-mono tabular-nums text-right text-gray-400">{r.weight.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  ) : null;

export const EtfPanel: React.FC<{ symbol: string; onSelect: (s: string) => void }> = ({ symbol, onSelect }) => {
  const [vs, setVs] = useState("");
  const [vsDraft, setVsDraft] = useState("");
  useEffect(() => {
    setVs("");
    setVsDraft("");
  }, [symbol]);
  const sym = symbol.replace("^", "");
  const { data, loading, error } = useJson<EtfData>(`/api/market/desk?view=etf&symbol=${encodeURIComponent(sym)}${vs ? `&vs=${encodeURIComponent(vs)}` : ""}`);
  const o = data?.overlap;

  return (
    <FnPanel
      code="ETF"
      title={`ETF Analysis — ${sym}`}
      subtitle={data?.name ? `${data.name}${data.issuer ? ` · ${data.issuer}` : ""}` : "Holdings, sector and country exposure, overlap with another fund"}
      right={
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setVs(vsDraft.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, ""));
          }}
          className="flex items-center gap-1.5"
        >
          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500" htmlFor="etf-vs">Overlap vs</label>
          <input id="etf-vs" value={vsDraft} onChange={(e) => setVsDraft(e.target.value.toUpperCase())} placeholder="QQQ" spellCheck={false}
            className="w-20 px-2 py-1 rounded-md bg-night border border-white/10 font-mono text-xs text-gray-100 placeholder-gray-600 outline-none focus:border-yellow-400/50" />
          <button type="submit" className="px-2.5 py-1 rounded-md bg-yellow-400 text-black text-[11px] font-black">Compare</button>
        </form>
      }
    >
      {loading && !data ? (
        <Loading rows={10} />
      ) : error || !data?.holdings ? (
        <Empty text={`${sym} is not an ETF, or its holdings are not available. Load an ETF such as SPY, QQQ or VTI and run ETF again.`} />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/5 border-b border-white/5">
            {[
              { k: "Assets", v: isNum(data.aum) ? `$${fmtBig(data.aum)}` : "—" },
              { k: "Expense ratio", v: isNum(data.expenseRatio) ? `${data.expenseRatio.toFixed(2)}%` : "—" },
              { k: "Holdings", v: data.holdingsCount.toLocaleString() },
              { k: "Top 10 weight", v: `${data.top10.toFixed(1)}%` },
            ].map((s) => (
              <div key={s.k} className="bg-surface px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{s.k}</p>
                <p className="mt-0.5 font-mono tabular-nums text-sm text-gray-100">{s.v}</p>
              </div>
            ))}
          </div>

          {o && (
            <div className="p-4 border-b border-white/5 bg-yellow-400/[0.03]">
              {o.error ? (
                <p className="text-sm text-gray-400">No holdings found for {o.vs}, so overlap can&apos;t be computed.</p>
              ) : (
                <>
                  <p className="text-sm text-gray-200">
                    <span className="font-mono font-bold text-yellow-300">{o.weight!.toFixed(1)}%</span> of {sym} and {o.vs} sits in the same holdings —{" "}
                    {o.count} shared names out of {o.ofA} and {o.ofB}.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {o.top!.map((t) => (
                      <button key={t.asset} onClick={() => onSelect(t.asset)} className="px-2 py-1 rounded-md border border-white/10 hover:border-yellow-400/40 font-mono text-[11px]">
                        <span className="text-gray-100 font-bold">{t.asset}</span> <span className="text-gray-500">{t.a.toFixed(1)}% / {t.b.toFixed(1)}%</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px]">
            <div className="overflow-x-auto max-h-[560px] overflow-y-auto xl:border-r border-white/5">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-surface z-10">
                  <tr className="border-b border-white/10">
                    <th className={th}>#</th>
                    <th className={th}>Holding</th>
                    <th className={`${th} text-right`}>Weight</th>
                    <th className={`${th} text-right`}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {data.holdings.map((h, i) => {
                    const ok = /^[A-Z.]{1,6}$/.test(h.asset);
                    return (
                      <tr key={`${h.asset}-${i}`} onClick={() => ok && onSelect(h.asset)} className={`border-b border-white/5 ${ok ? "cursor-pointer hover:bg-white/[0.04]" : ""}`}>
                        <td className={`${td} text-gray-600`}>{i + 1}</td>
                        <td className="px-3 py-2 text-xs">
                          <span className="font-mono font-bold text-gray-100">{h.asset || "—"}</span>
                          <span className="ml-2 text-gray-500">{h.name}</span>
                        </td>
                        <td className={`${td} text-right text-gray-100`}>{h.weight.toFixed(2)}%</td>
                        <td className={`${td} text-right text-gray-400`}>{isNum(h.value) ? `$${fmtBig(h.value)}` : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-white/5">
              <WeightBars title="Sectors" rows={data.sectors} />
              <WeightBars title="Countries" rows={data.countries} />
            </div>
          </div>
        </>
      )}
    </FnPanel>
  );
};

/* ------------------------------- FIL ------------------------------- */

interface Filing {
  fillingDate: string;
  type: string;
  link: string;
  finalLink: string;
}

export const FilingsPanel: React.FC<{ symbol: string; onRun: RunPanel }> = ({ symbol, onRun }) => {
  const { data, loading } = useJson<Filing[]>(`/api/market/fundamentals?symbol=${encodeURIComponent(symbol)}&dataset=sec-filings`);
  const rows = Array.isArray(data) ? data : [];
  const types = ["All", ...["10-K", "10-Q", "8-K", "4", "DEF 14A"].filter((t) => rows.some((r) => r.type === t))];
  const [type, setType] = useState("All");
  const [brief, setBrief] = useState<{ a?: string; panels?: Panel[]; error?: string; busy?: boolean } | null>(null);
  useEffect(() => {
    setBrief(null);
    setType("All");
  }, [symbol]);

  const runBrief = async () => {
    setBrief({ busy: true });
    try {
      const out = await askApi({ mode: "brief", symbol });
      setBrief({ a: out.answer, panels: out.panels });
    } catch (e) {
      setBrief({ error: (e as Error).message });
    }
  };
  const shown = rows.filter((r) => type === "All" || r.type === type);

  return (
    <FnPanel
      code="FIL"
      title={`Filings — ${symbol}`}
      subtitle="Recent SEC filings, with an AI brief on the latest reported quarter"
      right={types.length > 2 ? <Pills options={types} value={type} onChange={setType} /> : undefined}
    >
      <div className="p-4 border-b border-white/5">
        {!brief ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-400 max-w-[60ch]">
              Get a short brief on what changed in the latest quarter: revenue, earnings, margins, cash flow and how results compared with estimates.
            </p>
            <button onClick={runBrief} className="px-4 py-2 rounded-lg bg-yellow-400 text-black text-xs font-black hover:bg-yellow-300 transition-colors">Brief me on the quarter</button>
          </div>
        ) : brief.busy ? (
          <p className="text-xs font-mono text-gray-500 animate-pulse">Reading the financial statements…</p>
        ) : brief.error ? (
          <p className="text-sm text-red-400" role="alert">{brief.error} <button onClick={runBrief} className="underline text-gray-300">Retry</button></p>
        ) : (
          <>
            <Answer text={brief.a!} />
            <PanelChips panels={brief.panels ?? []} onRun={onRun} />
            <p className="mt-2 text-[10px] text-gray-600">AI-generated from reported financials and estimates, not from the filing text. Verify in FA and ERN.</p>
          </>
        )}
      </div>
      {loading && !rows.length ? (
        <Loading rows={8} />
      ) : !shown.length ? (
        <Empty text="No filings found for this symbol." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10">
                <th className={th}>Filed</th>
                <th className={th}>Form</th>
                <th className={`${th} text-right`}>Document</th>
                <th className={`${th} text-right`}>Filing index</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((f, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/[0.04]">
                  <td className={`${td} text-gray-400`}>{new Date(`${f.fillingDate.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</td>
                  <td className={`${td} font-bold text-gray-100`}>{f.type}</td>
                  <td className={`${td} text-right`}>
                    {f.finalLink ? <a href={f.finalLink} target="_blank" rel="noopener noreferrer" className="text-yellow-300 hover:underline">Open ↗</a> : "—"}
                  </td>
                  <td className={`${td} text-right`}>
                    {f.link ? <a href={f.link} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-yellow-300">SEC ↗</a> : "—"}
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

/* --------------------------- DVDC / SPLT --------------------------- */

interface DivRow {
  date: string;
  symbol: string;
  name: string;
  dividend: number | null;
  price: number | null;
  marketCap: number | null;
  payDate: string | null;
}

export const DividendCalendar: React.FC<{ onSelect: (s: string) => void }> = ({ onSelect }) => {
  const { data, loading } = useJson<DivRow[]>("/api/market/desk?view=dividends");
  const rows = Array.isArray(data) ? data : [];
  const days = [...new Set(rows.map((r) => r.date))];
  return (
    <FnPanel code="DVDC" title="Dividend Calendar" subtitle="Ex-dividend dates over the next two weeks · US companies of $2B+ market cap">
      {loading && !rows.length ? (
        <Loading rows={10} />
      ) : !rows.length ? (
        <Empty text="No upcoming ex-dividend dates found." />
      ) : (
        <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-surface z-10">
              <tr className="border-b border-white/10">
                <th className={th}>Ex-date</th>
                <th className={th}>Ticker</th>
                <th className={th}>Company</th>
                <th className={`${th} text-right`}>Dividend</th>
                <th className={`${th} text-right`}>Yield (this payment)</th>
                <th className={`${th} text-right`}>Mkt cap</th>
                <th className={`${th} text-right`}>Pay date</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <React.Fragment key={d}>
                  <tr className="bg-white/[0.02] border-b border-white/5">
                    <td colSpan={7} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-yellow-300">{dayLabel(d)}</td>
                  </tr>
                  {rows.filter((r) => r.date === d).map((r) => (
                    <tr key={`${d}-${r.symbol}`} onClick={() => onSelect(r.symbol)} className="border-b border-white/5 cursor-pointer hover:bg-white/[0.04]">
                      <td className={`${td} text-gray-500`}>{shortDate(r.date)}</td>
                      <td className={`${td} font-bold text-gray-100`}>{r.symbol}</td>
                      <td className="px-3 py-2 text-xs text-gray-400 max-w-[280px] truncate">{r.name}</td>
                      <td className={`${td} text-right text-gray-100`}>${fmtP(r.dividend, 4)}</td>
                      <td className={`${td} text-right text-gray-300`}>{isNum(r.dividend) && r.price ? `${((r.dividend / r.price) * 100).toFixed(2)}%` : "—"}</td>
                      <td className={`${td} text-right text-gray-400`}>{fmtBig(r.marketCap)}</td>
                      <td className={`${td} text-right text-gray-500`}>{r.payDate ? shortDate(r.payDate) : "—"}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </FnPanel>
  );
};

interface SplitRow {
  date: string;
  symbol: string;
  numerator: number;
  denominator: number;
}

export const SplitCalendar: React.FC<{ onSelect: (s: string) => void }> = ({ onSelect }) => {
  const { data, loading } = useJson<SplitRow[]>("/api/market/desk?view=splits");
  const rows = Array.isArray(data) ? data : [];
  const today = new Date().toISOString().slice(0, 10);
  return (
    <FnPanel code="SPLT" title="Stock Split Calendar" subtitle="US splits from the past two weeks through the next six">
      {loading && !rows.length ? (
        <Loading rows={8} />
      ) : !rows.length ? (
        <Empty text="No splits on the calendar." />
      ) : (
        <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-surface z-10">
              <tr className="border-b border-white/10">
                <th className={th}>Date</th>
                <th className={th}>Ticker</th>
                <th className={th}>Ratio</th>
                <th className={th}>Type</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const forward = r.numerator > r.denominator;
                return (
                  <tr key={i} onClick={() => onSelect(r.symbol)} className="border-b border-white/5 cursor-pointer hover:bg-white/[0.04]">
                    <td className={`${td} text-gray-400`}>{shortDate(r.date)}</td>
                    <td className={`${td} font-bold text-gray-100`}>{r.symbol}</td>
                    <td className={`${td} text-gray-100`}>{r.numerator}-for-{r.denominator}</td>
                    <td className={`${td} ${forward ? "text-green-400" : "text-red-400"}`}>{forward ? "Forward" : "Reverse"}</td>
                    <td className={`${td} text-gray-500`}>{r.date < today ? "Effective" : "Upcoming"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </FnPanel>
  );
};

/* ------------------------------- MNA ------------------------------- */

interface Deal {
  date: string;
  acquirer: string;
  acquirerSymbol: string;
  target: string;
  targetSymbol: string;
  link: string | null;
}

export const DealsBoard: React.FC<{ onSelect: (s: string) => void }> = ({ onSelect }) => {
  const { data, loading } = useJson<Deal[]>("/api/market/desk?view=mna");
  const rows = Array.isArray(data) ? data : [];
  const sym = (s: string) =>
    /^[A-Z.]{1,6}$/.test(s) ? (
      <button onClick={() => onSelect(s)} className="ml-2 font-mono font-bold text-yellow-300 hover:underline">{s}</button>
    ) : null;
  return (
    <FnPanel code="MNA" title="Mergers & Acquisitions" subtitle="Latest deal filings with the SEC">
      {loading && !rows.length ? (
        <Loading rows={10} />
      ) : !rows.length ? (
        <Empty text="M&A filings are unavailable right now." />
      ) : (
        <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-surface z-10">
              <tr className="border-b border-white/10">
                <th className={th}>Filed</th>
                <th className={th}>Acquirer</th>
                <th className={th}>Target</th>
                <th className={`${th} text-right`}>Filing</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/[0.04]">
                  <td className={`${td} text-gray-500`}>{shortDate(r.date)}</td>
                  <td className="px-3 py-2 text-xs text-gray-100">{r.acquirer}{sym(r.acquirerSymbol)}</td>
                  <td className="px-3 py-2 text-xs text-gray-100">{r.target || "—"}{sym(r.targetSymbol)}</td>
                  <td className={`${td} text-right`}>
                    {r.link ? <a href={r.link} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-yellow-300">SEC ↗</a> : "—"}
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

/* ------------------------------- ALRT ------------------------------- */

interface Alert {
  id: number;
  symbol: string;
  targetPrice: number;
  direction: string;
  isTriggered: boolean;
  triggeredAt: string | null;
  createdAt: string;
}

export const SignInNote: React.FC<{ what: string }> = ({ what }) => (
  <div className="p-8 text-center">
    <p className="text-sm text-gray-300">Sign in to {what}.</p>
    <p className="mt-1 text-xs text-gray-500">It uses your WallStreetStocks account, the same one as the mobile app.</p>
    <Link href="/login?callbackUrl=/terminal" className="inline-block mt-4 px-4 py-2 rounded-lg bg-yellow-400 text-black text-xs font-black hover:bg-yellow-300">Sign in</Link>
  </div>
);

export const AlertsPanel: React.FC<{ symbol: string; price?: number; onSelect: (s: string) => void }> = ({ symbol, price, onSelect }) => {
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [auth, setAuth] = useState<"unknown" | "in" | "out">("unknown");
  const [form, setForm] = useState({ symbol: "", target: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [quotes, setQuotes] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/terminal/alerts", { cache: "no-store" });
      if (!r.ok) throw new Error();
      const d = await r.json();
      if (!d.signedIn) return setAuth("out");
      setAlerts(Array.isArray(d.alerts) ? d.alerts : []);
      setAuth("in");
    } catch {
      setErr("Alerts could not be loaded. Try again shortly.");
    }
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  // Last prices for the alert symbols, to show distance to target.
  const symKey = [...new Set((alerts ?? []).map((a) => a.symbol))].slice(0, 30).join(",");
  useEffect(() => {
    if (!symKey) return;
    let alive = true;
    const run = () =>
      fetch(`/api/market/quotes?symbols=${encodeURIComponent(symKey)}`)
        .then((r) => r.json())
        .then((d) => alive && Array.isArray(d) && setQuotes(Object.fromEntries(d.map((q: any) => [q.symbol, q.price]))))
        .catch(() => {});
    run();
    const t = setInterval(run, 30_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [symKey]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const s = (form.symbol || symbol).trim().toUpperCase();
    const target = Number(form.target);
    if (!(target > 0)) return setErr("Enter a target price above zero.");
    setErr("");
    setBusy(true);
    try {
      const r = await fetch("/api/terminal/alerts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ symbol: s, targetPrice: target }) });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.error || "The alert could not be saved.");
      setForm({ symbol: "", target: "" });
      await load();
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id: number) => {
    setAlerts((a) => (a ?? []).filter((x) => x.id !== id));
    const r = await fetch(`/api/terminal/alerts?id=${id}`, { method: "DELETE" }).catch(() => null);
    if (!r?.ok) {
      setErr("That alert could not be deleted.");
      load();
    }
  };

  const input = "w-full px-3 py-2 rounded-lg bg-night border border-white/10 text-sm font-mono text-gray-100 placeholder-gray-600 outline-none focus:border-yellow-400/50";
  const active = (alerts ?? []).filter((a) => !a.isTriggered);
  const fired = (alerts ?? []).filter((a) => a.isTriggered).slice(0, 20);

  return (
    <FnPanel code="ALRT" title="Price Alerts" subtitle="Saved to your account · delivered as a push notification in the WallStreetStocks app">
      {auth === "unknown" && !err ? (
        <Loading rows={5} />
      ) : auth === "out" ? (
        <SignInNote what="set price alerts" />
      ) : (
        <>
          <form onSubmit={add} className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_auto] gap-2 p-3 border-b border-white/5">
            <label className="block">
              <span className="block mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Ticker</span>
              <input className={input} placeholder={symbol.replace("^", "")} value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })} spellCheck={false} />
            </label>
            <label className="block">
              <span className="block mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Alert when price reaches</span>
              <input className={input} inputMode="decimal" placeholder={isNum(price) ? (price * 1.05).toFixed(2) : "0.00"} value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} />
            </label>
            <button type="submit" disabled={busy} className="col-span-2 sm:col-span-1 self-end px-4 py-2 rounded-lg bg-yellow-400 text-black text-xs font-black hover:bg-yellow-300 disabled:opacity-50">
              {busy ? "Saving…" : "Set alert"}
            </button>
            {err && <p className="col-span-full text-xs text-red-400" role="alert">{err}</p>}
          </form>

          {!alerts?.length ? (
            <Empty text="No alerts yet. Set a target above or below the current price and you'll get a push in the app when it's reached." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className={th}>Ticker</th>
                    <th className={th}>Condition</th>
                    <th className={`${th} text-right`}>Target</th>
                    <th className={`${th} text-right`}>Last</th>
                    <th className={`${th} text-right`}>Distance</th>
                    <th className={th}>Status</th>
                    <th className={th}><span className="sr-only">Delete</span></th>
                  </tr>
                </thead>
                <tbody>
                  {[...active, ...fired].map((a) => {
                    const last = quotes[a.symbol];
                    const dist = isNum(last) && last > 0 ? ((a.targetPrice - last) / last) * 100 : null;
                    return (
                      <tr key={a.id} className="border-b border-white/5 hover:bg-white/[0.04]">
                        <td className={td}><button onClick={() => onSelect(a.symbol)} className="font-bold text-yellow-300 hover:underline">{a.symbol}</button></td>
                        <td className={`${td} text-gray-300`}>{a.direction === "below" ? "Falls to" : "Rises to"}</td>
                        <td className={`${td} text-right text-gray-100`}>{fmtP(a.targetPrice)}</td>
                        <td className={`${td} text-right text-gray-400`}>{fmtP(last)}</td>
                        <td className={`${td} text-right ${a.isTriggered ? "text-gray-600" : tone(dist)}`}>{a.isTriggered ? "—" : fmtPctS(dist)}</td>
                        <td className={`${td} ${a.isTriggered ? "text-green-400" : "text-gray-400"}`}>
                          {a.isTriggered ? `Triggered${a.triggeredAt ? ` ${shortDate(a.triggeredAt)}` : ""}` : "Watching"}
                        </td>
                        <td className={`${td} text-right`}>
                          <button onClick={() => remove(a.id)} aria-label={`Delete ${a.symbol} alert`} className="text-gray-600 hover:text-red-400">✕</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </FnPanel>
  );
};
