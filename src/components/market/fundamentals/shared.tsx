"use client";

// Shared primitives for the /terminal fundamentals suite.
// Design language: bg-surface cards, white/10 borders, gold accents,
// font-mono tabular-nums for every number, green/red for +/-.

import React, { useEffect, useState } from "react";

/* ------------------------------ data hook ------------------------------ */

export function useDataset<T = any>(
  symbol: string,
  dataset: string,
  period?: "annual" | "quarter",
  extra?: string
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Empty dataset = disabled fetch (e.g. transcript before a quarter is picked)
    if (!dataset) {
      setData(null);
      setLoading(false);
      setError(false);
      return;
    }
    let alive = true;
    setLoading(true);
    setError(false);
    setData(null);
    const qs = `symbol=${encodeURIComponent(symbol)}&dataset=${dataset}${
      period ? `&period=${period}` : ""
    }${extra ? `&${extra}` : ""}`;
    fetch(`/api/market/fundamentals?${qs}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("bad status"))))
      .then((d) => {
        if (!alive) return;
        setData(d && d.error ? null : d);
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setError(true);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [symbol, dataset, period, extra]);

  return { data, loading, error };
}

/* ------------------------------ formatters ----------------------------- */

const isNum = (v: any): v is number => typeof v === "number" && isFinite(v);

/** $4.59T / $394.33B / $12.5M / $950K / -$1.2B — for money magnitudes. */
export const fmtMoney = (v?: number | null, digits = 2): string => {
  if (!isNum(v)) return "—";
  const sign = v < 0 ? "-" : "";
  const a = Math.abs(v);
  if (a >= 1e12) return `${sign}$${(a / 1e12).toFixed(digits)}T`;
  if (a >= 1e9) return `${sign}$${(a / 1e9).toFixed(digits)}B`;
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${sign}$${(a / 1e3).toFixed(1)}K`;
  return `${sign}$${a.toFixed(2)}`;
};

/** Plain compact count (no $): 14.67B / 57.0M / 8,466. */
export const fmtCount = (v?: number | null): string => {
  if (!isNum(v)) return "—";
  const sign = v < 0 ? "-" : "";
  const a = Math.abs(v);
  if (a >= 1e9) return `${sign}${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${sign}${(a / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${sign}${Math.round(a).toLocaleString("en-US")}`;
  return `${sign}${a.toLocaleString("en-US")}`;
};

/** Exact dollars: $211.45 (2dp). */
export const fmtUsd = (v?: number | null, digits = 2): string =>
  isNum(v) ? `$${v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}` : "—";

/** Plain number, default 2dp. */
export const fmtNum = (v?: number | null, digits = 2): string =>
  isNum(v) ? v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits }) : "—";

/** Ratio 0.0642 → "6.42%". Pass alreadyPct for values like 33.6. */
export const fmtPct = (v?: number | null, alreadyPct = false, digits = 2): string => {
  if (!isNum(v)) return "—";
  return `${(alreadyPct ? v : v * 100).toFixed(digits)}%`;
};

/** Ratio → "+6.4%" / "-2.1%" with sign. */
export const fmtSignedPct = (v?: number | null, alreadyPct = false, digits = 1): string => {
  if (!isNum(v)) return "—";
  const p = alreadyPct ? v : v * 100;
  return `${p >= 0 ? "+" : ""}${p.toFixed(digits)}%`;
};

/** Date-only strings parse as UTC midnight and shift a day back for US
 *  viewers — force local midnight instead. */
const parseDate = (d: string): Date => {
  const s = String(d).replace(" ", "T");
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00`) : new Date(s);
};

/** "2026-06-27" → "Jun 27, 2026" */
export const fmtDate = (d?: string | null): string => {
  if (!d) return "—";
  const dt = parseDate(String(d));
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

/** "2026-06-27" → "Jun '26" — compact column headers. */
export const fmtDateShort = (d?: string | null): string => {
  if (!d) return "—";
  const dt = parseDate(String(d));
  if (isNaN(dt.getTime())) return String(d);
  return `${dt.toLocaleDateString("en-US", { month: "short" })} '${String(dt.getFullYear()).slice(2)}`;
};

/** FY/Q label from a statement row: {period:"FY"|"Q3", calendarYear:"2025"}. */
export const periodLabel = (row: { period?: string; calendarYear?: string | number }): string => {
  if (!row) return "—";
  const p = row.period === "FY" ? "FY" : row.period || "";
  return `${p} ${row.calendarYear ?? ""}`.trim();
};

/** Color class for a signed value. */
export const signClass = (v?: number | null): string =>
  !isNum(v) || v === 0 ? "text-gray-500" : v > 0 ? "text-green-400" : "text-red-400";

/* ------------------------------ components ----------------------------- */

export const SectionCard: React.FC<{
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, right, className = "", children }) => (
  <div className={`rounded-2xl border border-white/10 bg-surface overflow-hidden ${className}`}>
    <div className="px-4 md:px-5 py-3.5 border-b border-white/5 flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-sm font-bold text-gray-100 truncate">{title}</h3>
        {subtitle && <p className="text-[11px] text-gray-500 mt-0.5 truncate">{subtitle}</p>}
      </div>
      {right && <div className="min-w-0 max-w-full overflow-x-auto">{right}</div>}
    </div>
    {children}
  </div>
);

export const StatRow: React.FC<{
  label: string;
  value: React.ReactNode;
  sub?: string;
}> = ({ label, value, sub }) => (
  <div className="flex items-center justify-between gap-3 py-2.5 border-b border-white/5 last:border-0">
    <div className="min-w-0">
      <span className="text-xs text-gray-500">{label}</span>
      {sub && <span className="block text-[10px] text-gray-600">{sub}</span>}
    </div>
    <span className="font-mono text-sm tabular-nums text-gray-100 text-right">{value}</span>
  </div>
);

export const DeltaPill: React.FC<{ v?: number | null; alreadyPct?: boolean }> = ({
  v,
  alreadyPct = false,
}) => {
  if (!isNum(v))
    return <span className="text-[11px] font-mono text-gray-600">—</span>;
  const p = alreadyPct ? v : v * 100;
  const up = p >= 0;
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-mono font-bold tabular-nums ${
        up ? "bg-green-400/10 text-green-400" : "bg-red-400/10 text-red-400"
      }`}
    >
      {up ? "+" : ""}
      {p.toFixed(1)}%
    </span>
  );
};

export const Skeleton: React.FC<{ rows?: number; className?: string }> = ({
  rows = 6,
  className = "",
}) => (
  <div className={`p-4 space-y-3 ${className}`}>
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        className="h-4 rounded bg-white/[0.05] animate-pulse"
        style={{ width: `${88 - ((i * 13) % 40)}%` }}
      />
    ))}
  </div>
);

export const EmptyNote: React.FC<{ text?: string }> = ({
  text = "No data available for this symbol.",
}) => <p className="text-center text-gray-600 text-sm py-10 px-4">{text}</p>;

/** Tiny inline bar chart for a value series (oldest → newest, left → right). */
export const Sparkbars: React.FC<{
  values: (number | null | undefined)[];
  width?: number;
  height?: number;
}> = ({ values, width = 64, height = 20 }) => {
  const nums = values.map((v) => (isNum(v) ? v : 0));
  if (!nums.some((v) => v !== 0)) return null;
  const max = Math.max(...nums.map(Math.abs), 1e-9);
  const n = nums.length;
  const gap = 2;
  const bw = Math.max((width - gap * (n - 1)) / n, 2);
  const zero = height;
  return (
    <svg width={width} height={height} className="flex-shrink-0" aria-hidden>
      {nums.map((v, i) => {
        const h = Math.max((Math.abs(v) / max) * (height - 2), 1.5);
        return (
          <rect
            key={i}
            x={i * (bw + gap)}
            y={zero - h}
            width={bw}
            height={h}
            rx={1}
            className={v >= 0 ? "fill-yellow-400/70" : "fill-red-400/80"}
          />
        );
      })}
    </svg>
  );
};

/** Range position bar (e.g. 52-week low/high with current marker). */
export const RangeBar: React.FC<{
  low?: number | null;
  high?: number | null;
  value?: number | null;
  labelLow?: string;
  labelHigh?: string;
}> = ({ low, high, value, labelLow, labelHigh }) => {
  if (!isNum(low) || !isNum(high) || !isNum(value) || high <= low) return null;
  const pct = Math.min(Math.max(((value - low) / (high - low)) * 100, 0), 100);
  return (
    <div>
      <div className="relative h-1.5 rounded-full bg-white/10">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-yellow-500/40 to-yellow-400"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-yellow-300 border-2 border-night shadow-[0_0_8px_rgba(255,215,0,0.6)]"
          style={{ left: `calc(${pct}% - 5px)` }}
        />
      </div>
      {(labelLow || labelHigh) && (
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] font-mono text-gray-500">{labelLow}</span>
          <span className="text-[10px] font-mono text-gray-500">{labelHigh}</span>
        </div>
      )}
    </div>
  );
};

/** Pill segmented control (Annual / Quarterly, statement pickers, …). */
export const SegmentedControl: React.FC<{
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
  size?: "sm" | "md";
}> = ({ options, value, onChange, size = "sm" }) => (
  <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/10">
    {options.map((o) => (
      <button
        key={o.key}
        onClick={() => onChange(o.key)}
        className={`${size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3.5 py-1.5 text-xs"} rounded-lg font-bold transition-colors whitespace-nowrap ${
          value === o.key
            ? "bg-yellow-400/15 text-yellow-300 border border-yellow-400/30"
            : "text-gray-500 hover:text-gray-200 border border-transparent"
        }`}
      >
        {o.label}
      </button>
    ))}
  </div>
);
