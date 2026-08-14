"use client";

import { useEffect, useState } from "react";

// Real price series for panel sparklines, from the same /api/market/chart
// proxy the Terminal uses. Module-level cache + in-flight dedupe so a grid
// of sparklines costs one request per symbol.

export interface SparkData {
  closes: number[];
  tFirst: string;
  tMid: string;
  tLast: string;
}

const cache = new Map<string, SparkData>();
const inflight = new Map<string, Promise<SparkData | null>>();

async function fetchSpark(symbol: string, range: string, maxPoints: number): Promise<SparkData | null> {
  try {
    const r = await fetch(`/api/market/chart?symbol=${encodeURIComponent(symbol)}&range=${range}`);
    if (!r.ok) return null;
    const bars = await r.json();
    if (!Array.isArray(bars) || bars.length < 2) return null;
    const all: number[] = bars.map((b: { c: number }) => b.c).filter((c: number) => Number.isFinite(c));
    if (all.length < 2) return null;

    // Downsample from the end so the latest close is always included
    const step = Math.max(1, Math.ceil(all.length / maxPoints));
    const closes: number[] = [];
    for (let i = all.length - 1; i >= 0; i -= step) closes.push(all[i]);
    closes.reverse();

    return {
      closes,
      tFirst: String(bars[0].t ?? ""),
      tMid: String(bars[Math.floor(bars.length / 2)].t ?? ""),
      tLast: String(bars[bars.length - 1].t ?? ""),
    };
  } catch {
    return null;
  }
}

export function useSparkSeries(symbol: string, range = "1D", maxPoints = 24): SparkData | null {
  const key = `${symbol}|${range}|${maxPoints}`;
  const [data, setData] = useState<SparkData | null>(() => cache.get(key) ?? null);

  useEffect(() => {
    const hit = cache.get(key);
    if (hit) {
      setData(hit);
      return;
    }
    let alive = true;
    let p = inflight.get(key);
    if (!p) {
      p = fetchSpark(symbol, range, maxPoints);
      inflight.set(key, p);
    }
    p.then((d) => {
      inflight.delete(key);
      if (d) {
        cache.set(key, d);
        if (alive) setData(d);
      }
    });
    return () => {
      alive = false;
    };
  }, [key, symbol, range, maxPoints]);

  return data;
}

// "2026-08-13 09:30:00" → "9:30 AM"; date-only bars → "08-13"
export const fmtBarTime = (t: string): string => {
  const hm = t.slice(11, 16);
  if (!hm || !hm.includes(":")) return t.slice(5, 10);
  const [hStr, mStr] = hm.split(":");
  let h = parseInt(hStr, 10);
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${mStr} ${ap}`;
};
