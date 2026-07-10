"use client";

import { useEffect, useState } from "react";

export interface Quote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  dayHigh?: number;
  dayLow?: number;
  yearHigh?: number;
  yearLow?: number;
  marketCap?: number;
  volume?: number;
  pe?: number;
  previousClose?: number;
}

// Poll the server-side quote proxy. Refreshes every `intervalMs` (default 30s).
export function useQuotes(symbols: string[], intervalMs = 30000) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const key = symbols.join(",");

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const load = async () => {
      try {
        const res = await fetch(`/api/market/quotes?symbols=${encodeURIComponent(key)}`);
        const data = await res.json();
        if (alive && Array.isArray(data)) {
          // Preserve requested order
          const order = key.split(",");
          data.sort((a: Quote, b: Quote) => order.indexOf(a.symbol) - order.indexOf(b.symbol));
          setQuotes(data);
        }
      } catch {
        // keep last data
      } finally {
        if (alive) setLoading(false);
      }
    };

    setLoading(true);
    load();
    timer = setInterval(load, intervalMs);
    return () => {
      alive = false;
      if (timer) clearInterval(timer);
    };
  }, [key, intervalMs]);

  return { quotes, loading };
}

export const fmtPrice = (v?: number) =>
  v == null ? "—" : v >= 1000 ? v.toLocaleString(undefined, { maximumFractionDigits: 0 }) : v.toFixed(2);

export const fmtCap = (v?: number) => {
  if (!v) return "—";
  if (v >= 1e12) return `${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
  return `${v}`;
};
