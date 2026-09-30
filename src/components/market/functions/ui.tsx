"use client";

// Shared bits for terminal function panels: a polling JSON hook, the
// function-panel frame, table cell styles and number formatters.

import React, { useEffect, useState } from "react";

export function useJson<T = any>(url: string | null, pollMs = 0, body?: unknown) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const bodyKey = body === undefined ? "" : JSON.stringify(body);

  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    setError(false);
    const load = () =>
      fetch(url, bodyKey ? { method: "POST", headers: { "Content-Type": "application/json" }, body: bodyKey } : undefined)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((d) => {
          if (!alive) return;
          setData(d);
          setError(false);
        })
        .catch(() => alive && setError(true))
        .finally(() => alive && setLoading(false));
    load();
    const timer = pollMs ? setInterval(load, pollMs) : null;
    return () => {
      alive = false;
      if (timer) clearInterval(timer);
    };
  }, [url, pollMs, bodyKey]);

  return { data, loading, error };
}

/** Frame for a function panel: amber mnemonic + title, optional controls. */
export const FnPanel: React.FC<{
  code: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}> = ({ code, title, subtitle, right, children }) => (
  <div className="rounded-2xl border border-white/10 bg-surface overflow-hidden">
    <div className="px-4 md:px-5 py-3 border-b border-white/5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="px-2 py-1 rounded-md bg-yellow-400 text-black text-[11px] font-mono font-black tracking-wider">
          {code}
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-gray-100 truncate">{title}</h3>
          {subtitle && <p className="text-[11px] text-gray-500 truncate">{subtitle}</p>}
        </div>
      </div>
      {right && <div className="flex flex-wrap items-center gap-2 max-w-full">{right}</div>}
    </div>
    {children}
  </div>
);

export const th = "px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap";
export const td = "px-3 py-2 font-mono tabular-nums text-xs whitespace-nowrap";

export const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export const fmtP = (v?: number | null, digits?: number): string => {
  if (!isNum(v)) return "—";
  const d = digits ?? (Math.abs(v) >= 1000 ? 2 : Math.abs(v) >= 1 ? 2 : 4);
  return v.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
};

export const fmtChg = (v?: number | null, digits = 2): string =>
  !isNum(v) ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(digits)}`;

export const fmtPctS = (v?: number | null, digits = 2): string =>
  !isNum(v) ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(digits)}%`;

export const fmtBig = (v?: number | null): string => {
  if (!isNum(v)) return "—";
  const a = Math.abs(v);
  if (a >= 1e12) return `${(v / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toFixed(0);
};

export const tone = (v?: number | null): string =>
  !isNum(v) || v === 0 ? "text-gray-400" : v > 0 ? "text-green-400" : "text-red-400";

/** Background heat for a % move (green/red, intensity capped at ±3%). */
export const heat = (pct?: number | null, cap = 3): React.CSSProperties => {
  if (!isNum(pct) || pct === 0) return {};
  const a = Math.min(Math.abs(pct) / cap, 1) * 0.32 + 0.04;
  return { background: pct > 0 ? `rgba(74,222,128,${a})` : `rgba(248,113,113,${a})` };
};

export const Pills: React.FC<{
  options: readonly string[] | { key: string; label: string }[];
  value: string;
  onChange: (k: string) => void;
}> = ({ options, value, onChange }) => (
  <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg border border-white/10">
    {options.map((o) => {
      const key = typeof o === "string" ? o : o.key;
      const label = typeof o === "string" ? o : o.label;
      return (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold transition-colors ${
            value === key ? "bg-yellow-400/15 text-yellow-300" : "text-gray-500 hover:text-gray-200"
          }`}
        >
          {label}
        </button>
      );
    })}
  </div>
);

export const Loading: React.FC<{ rows?: number }> = ({ rows = 8 }) => (
  <div className="p-4 space-y-2.5">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-4 rounded bg-white/[0.05] animate-pulse" style={{ width: `${92 - ((i * 11) % 35)}%` }} />
    ))}
  </div>
);

export const Empty: React.FC<{ text: string }> = ({ text }) => (
  <p className="text-center text-gray-600 text-sm py-12 px-4">{text}</p>
);

/** Parse an FMP/TD bar timestamp as a local Date without the UTC day-shift. */
export const barDate = (t: string): Date =>
  t.length > 10 ? new Date(t.replace(" ", "T")) : new Date(`${t}T00:00:00`);

export const fmtBarDate = (t: string): string =>
  barDate(t).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

export async function fetchBars(symbol: string, range: string) {
  const r = await fetch(`/api/market/chart?symbol=${encodeURIComponent(symbol)}&range=${range}`);
  if (!r.ok) throw new Error("chart");
  const d = await r.json();
  return Array.isArray(d) ? d : [];
}
