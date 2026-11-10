"use client";

// A single terminal panel in its own window (opened with "Pop out" or P).
// It covers the site chrome so the window is nothing but the panel, and keeps
// its own ?symbol=&fn= so it can sit on a second monitor and be reloaded.

import React, { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuotes } from "@/components/market/useQuotes";
import { Tick } from "@/components/market/live";
import { FUNCTIONS, findFn } from "@/components/market/functions/registry";
import { renderPanel } from "@/components/market/functions/panels";
import { fmtP, fmtPctS, tone } from "@/components/market/functions/ui";

const cleanSym = (s: string) => s.trim().toUpperCase().replace(/[^A-Z0-9^./-]/g, "").slice(0, 12);

function PopInner() {
  const router = useRouter();
  const params = useSearchParams();
  const symbol = cleanSym(params.get("symbol") || "NVDA") || "NVDA";
  const def = findFn(params.get("fn") || "") ?? findFn("GP")!;
  const fn = def.href ? "GP" : def.code;

  const symbolArr = useMemo(() => [symbol], [symbol]);
  const { quotes } = useQuotes(symbolArr, 30_000, true);
  const q = quotes[0];

  const open = (s: string, code: string) => {
    const f = findFn(code);
    if (f?.href) {
      window.open(f.href, "_blank");
      return;
    }
    router.replace(`/terminal/pop?${new URLSearchParams({ symbol: cleanSym(s) || symbol, fn: code }).toString()}`);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-night text-white overflow-auto">
      <div className="sticky top-0 z-10 flex items-center gap-3 px-3 py-2 border-b border-white/10 bg-night/95 backdrop-blur">
        <span className="font-mono text-sm font-bold text-yellow-300">{symbol.replace("^", "")}</span>
        {q && (
          <span className="font-mono text-xs tabular-nums">
            <Tick value={q.price} className="text-gray-100 rounded px-1">{fmtP(q.price)}</Tick>{" "}
            <span className={tone(q.changePercent)}>{fmtPctS(q.changePercent)}</span>
          </span>
        )}
        <select
          value={fn}
          onChange={(e) => open(symbol, e.target.value)}
          aria-label="Function"
          className="ml-auto bg-surface border border-white/10 rounded-md px-2 py-1 font-mono text-[11px] font-bold text-yellow-300 outline-none"
        >
          {FUNCTIONS.filter((f) => !f.href).map((f) => (
            <option key={f.code} value={f.code}>{f.code} — {f.name}</option>
          ))}
        </select>
        <a href={`/terminal?${new URLSearchParams({ symbol, fn }).toString()}`} target="_blank" rel="noopener" className="text-[11px] text-gray-400 hover:text-yellow-300 whitespace-nowrap">
          Full terminal ↗
        </a>
      </div>
      <div className="p-3" key={`${fn}-${def.scope === "security" ? symbol : ""}`}>
        {renderPanel(fn, { symbol, quote: q, go: (s) => open(s, fn), run: (s, code) => open(s ?? symbol, code) })}
      </div>
    </div>
  );
}

export default function TerminalPopPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 z-[100] bg-night" />}>
      <PopInner />
    </Suspense>
  );
}
