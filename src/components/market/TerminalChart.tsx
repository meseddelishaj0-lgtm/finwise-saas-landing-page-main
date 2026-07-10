"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Custom chart engine — no third-party widgets. Candles + area, wheel/pinch
// zoom, drag pan, SMA/EMA overlays, log scale, fullscreen, crosshair OHLC
// tooltip, volume pane. Data via /api/market/chart (Twelve Data + FMP).

interface Bar {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

type RangeKey = "1D" | "5D" | "1M" | "6M" | "1Y" | "5Y";
type ChartStyle = "area" | "candles";

const RANGE_KEYS: RangeKey[] = ["1D", "5D", "1M", "6M", "1Y", "5Y"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const UP = "#4ade80";
const DOWN = "#f87171";
const GOLD = "#FFD60A";

const INDICATORS = [
  { key: "sma20", label: "SMA 20", color: "#38bdf8" },
  { key: "sma50", label: "SMA 50", color: "#a78bfa" },
  { key: "ema20", label: "EMA 20", color: "#fb923c" },
] as const;
type IndicatorKey = (typeof INDICATORS)[number]["key"];

const MIN_WINDOW = 8;

const fmtPrice = (v: number) =>
  v >= 10000
    ? v.toLocaleString(undefined, { maximumFractionDigits: 0 })
    : v >= 1
    ? v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : v.toPrecision(3);

const fmtVol = (v: number) => {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return `${Math.round(v)}`;
};

// Format "YYYY-MM-DD HH:MM:SS" without Date() — avoids timezone bugs
const timeLabel = (t: string, range: RangeKey, zoomed: boolean): string => {
  const mon = MONTHS[parseInt(t.slice(5, 7), 10) - 1] || "";
  const day = parseInt(t.slice(8, 10), 10);
  const hhmm = t.length > 11 ? t.slice(11, 16) : "";
  if (range === "1D" || (zoomed && hhmm && (range === "5D" || range === "1M"))) {
    const h = parseInt(hhmm.slice(0, 2), 10);
    const m = hhmm.slice(3, 5);
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const label = `${h12}:${m} ${h < 12 ? "AM" : "PM"}`;
    return range === "1D" ? label : `${mon} ${day} ${label}`;
  }
  if (range === "5D" || range === "1M" || range === "6M") return `${mon} ${day}`;
  return `${mon} ${t.slice(2, 4)}′`;
};

const tooltipLabel = (t: string): string => {
  const mon = MONTHS[parseInt(t.slice(5, 7), 10) - 1] || "";
  const day = parseInt(t.slice(8, 10), 10);
  const year = t.slice(0, 4);
  const hhmm = t.length > 11 ? t.slice(11, 16) : "";
  return hhmm ? `${mon} ${day}, ${year} · ${hhmm} ET` : `${mon} ${day}, ${year}`;
};

const sma = (bars: Bar[], period: number): (number | null)[] => {
  const out: (number | null)[] = new Array(bars.length).fill(null);
  let sum = 0;
  for (let i = 0; i < bars.length; i++) {
    sum += bars[i].c;
    if (i >= period) sum -= bars[i - period].c;
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
};

const ema = (bars: Bar[], period: number): (number | null)[] => {
  const out: (number | null)[] = new Array(bars.length).fill(null);
  const k = 2 / (period + 1);
  let prev: number | null = null;
  for (let i = 0; i < bars.length; i++) {
    prev = prev == null ? bars[i].c : bars[i].c * k + prev * (1 - k);
    if (i >= period - 1) out[i] = prev;
  }
  return out;
};

interface Props {
  symbol: string;
  prevClose?: number;
  height?: number;
}

const TerminalChart: React.FC<Props> = ({ symbol, prevClose, height = 500 }) => {
  const [range, setRange] = useState<RangeKey>("1D");
  const [style, setStyle] = useState<ChartStyle>("area");
  const [bars, setBars] = useState<Bar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hover, setHover] = useState<number | null>(null); // index in visible window
  const [width, setWidth] = useState(800);
  const [view, setView] = useState<{ s: number; e: number } | null>(null); // zoom window (full-array indices)
  const [logScale, setLogScale] = useState(false);
  const [showVolume, setShowVolume] = useState(true);
  const [indicators, setIndicators] = useState<Set<IndicatorKey>>(new Set());
  const [indicatorsOpen, setIndicatorsOpen] = useState(false);
  const [isFs, setIsFs] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; view: { s: number; e: number }; moved: boolean } | null>(null);
  const pinchRef = useRef<{ dist: number; view: { s: number; e: number } } | null>(null);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const viewRef = useRef(view);
  viewRef.current = view;
  const barsRef = useRef(bars);
  barsRef.current = bars;

  // ---- sizing ----
  useEffect(() => {
    const el = plotRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onFs = () => setIsFs(!!document.fullscreenElement && document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // ---- data ----
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    setHover(null);
    setView(null);
    fetch(`/api/market/chart?symbol=${encodeURIComponent(symbol)}&range=${range}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (!alive) return;
        if (Array.isArray(d) && d.length > 1) setBars(d);
        else {
          setBars([]);
          setError(true);
        }
      })
      .catch(() => {
        if (alive) {
          setBars([]);
          setError(true);
        }
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [symbol, range, reloadKey]);

  // ---- zoom window ----
  const total = bars.length;
  const win = view ?? { s: 0, e: Math.max(total - 1, 0) };
  const visible = useMemo(() => bars.slice(win.s, win.e + 1), [bars, win.s, win.e]);
  const n = visible.length;
  const zoomed = view != null;

  const clampView = useCallback((s: number, e: number, len: number) => {
    s = Math.round(s);
    e = Math.round(e);
    if (e - s + 1 < MIN_WINDOW) e = s + MIN_WINDOW - 1;
    if (s < 0) {
      e -= s;
      s = 0;
    }
    if (e > len - 1) {
      s -= e - (len - 1);
      e = len - 1;
    }
    s = Math.max(0, s);
    return { s, e };
  }, []);

  const zoomAt = useCallback(
    (factor: number, centerFrac: number) => {
      const len = barsRef.current.length;
      if (len < 2) return;
      const cur = viewRef.current ?? { s: 0, e: len - 1 };
      const size = cur.e - cur.s + 1;
      const newSize = Math.max(MIN_WINDOW, Math.min(len, Math.round(size * factor)));
      if (newSize === size && ((factor < 1 && size === MIN_WINDOW) || (factor > 1 && size === len))) return;
      const center = cur.s + centerFrac * size;
      const next = clampView(center - centerFrac * newSize, center - centerFrac * newSize + newSize - 1, len);
      setView(next.s === 0 && next.e === len - 1 ? null : next);
      setHover(null);
    },
    [clampView]
  );

  // Non-passive wheel handler (must preventDefault page scroll)
  useEffect(() => {
    const el = plotRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      zoomAt(e.deltaY > 0 ? 1.18 : 1 / 1.18, frac);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  // ---- pointer: hover, drag-pan, pinch ----
  const barsPerPx = n / Math.max(width - 66, 1);

  const onPointerDown = (e: React.PointerEvent) => {
    const el = plotRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      pinchRef.current = {
        dist: Math.abs(pts[0].x - pts[1].x) || 1,
        view: viewRef.current ?? { s: 0, e: barsRef.current.length - 1 },
      };
      dragRef.current = null;
    } else {
      dragRef.current = {
        x: e.clientX,
        view: viewRef.current ?? { s: 0, e: barsRef.current.length - 1 },
        moved: false,
      };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const el = plotRef.current;
    if (!el) return;
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Pinch zoom
    if (pinchRef.current && pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.abs(pts[0].x - pts[1].x) || 1;
      const ratio = pinchRef.current.dist / dist;
      const base = pinchRef.current.view;
      const len = barsRef.current.length;
      const size = base.e - base.s + 1;
      const newSize = Math.max(MIN_WINDOW, Math.min(len, Math.round(size * ratio)));
      const center = base.s + size / 2;
      const next = clampView(center - newSize / 2, center + newSize / 2 - 1, len);
      setView(next.s === 0 && next.e === len - 1 ? null : next);
      setHover(null);
      return;
    }

    // Drag pan
    if (dragRef.current && e.buttons > 0) {
      const dx = e.clientX - dragRef.current.x;
      if (Math.abs(dx) > 3) dragRef.current.moved = true;
      if (dragRef.current.moved) {
        const len = barsRef.current.length;
        const base = dragRef.current.view;
        const shift = Math.round(-dx * barsPerPx);
        const next = clampView(base.s + shift, base.e + shift, len);
        setView(next.s === 0 && next.e === len - 1 ? null : next);
        setHover(null);
        return;
      }
    }

    // Crosshair hover
    const rect = el.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const plotW = Math.max(50, width - 66);
    if (n) {
      const idx = Math.round((mx / plotW) * n - 0.5);
      setHover(Math.max(0, Math.min(n - 1, idx)));
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pointersRef.current.size === 0) dragRef.current = null;
  };

  // ---- geometry ----
  const PAD_TOP = 14;
  const AXIS_RIGHT = 66;
  const AXIS_BOTTOM = 24;
  const chartH = isFs ? Math.max(320, (typeof window !== "undefined" ? window.innerHeight : 800) - 120) : height;
  const VOL_H = showVolume ? Math.round(chartH * 0.14) : 0;
  const plotW = Math.max(50, width - AXIS_RIGHT);
  const priceH = chartH - PAD_TOP - AXIS_BOTTOM - VOL_H - (showVolume ? 8 : 0);
  const volTop = PAD_TOP + priceH + 8;

  const showPrev = range === "1D" && prevClose != null && prevClose > 0 && !zoomed;

  const indicatorSeries = useMemo(() => {
    const out: { key: IndicatorKey; color: string; values: (number | null)[] }[] = [];
    if (!bars.length) return out;
    if (indicators.has("sma20")) out.push({ key: "sma20", color: "#38bdf8", values: sma(bars, 20) });
    if (indicators.has("sma50")) out.push({ key: "sma50", color: "#a78bfa", values: sma(bars, 50) });
    if (indicators.has("ema20")) out.push({ key: "ema20", color: "#fb923c", values: ema(bars, 20) });
    return out;
  }, [bars, indicators]);

  const { min, max, maxVol } = useMemo(() => {
    if (!n) return { min: 0, max: 1, maxVol: 1 };
    let lo = Infinity;
    let hi = -Infinity;
    let mv = 0;
    for (const b of visible) {
      const bLo = style === "candles" ? b.l : b.c;
      const bHi = style === "candles" ? b.h : b.c;
      if (bLo < lo) lo = bLo;
      if (bHi > hi) hi = bHi;
      if (b.v > mv) mv = b.v;
    }
    for (const s of indicatorSeries) {
      for (let i = win.s; i <= win.e; i++) {
        const v = s.values[i];
        if (v != null) {
          if (v < lo) lo = v;
          if (v > hi) hi = v;
        }
      }
    }
    if (showPrev && prevClose) {
      if (prevClose < lo) lo = prevClose;
      if (prevClose > hi) hi = prevClose;
    }
    const pad = (hi - lo) * 0.06 || hi * 0.01 || 1;
    return { min: Math.max(lo - pad, logScale ? lo * 0.98 : -Infinity), max: hi + pad, maxVol: mv || 1 };
  }, [visible, style, showPrev, prevClose, n, indicatorSeries, win.s, win.e, logScale]);

  const x = useCallback((i: number) => ((i + 0.5) / Math.max(n, 1)) * plotW, [n, plotW]);
  const y = useCallback(
    (p: number) => {
      if (logScale && min > 0) {
        const lmin = Math.log(min);
        const lmax = Math.log(max);
        return PAD_TOP + ((lmax - Math.log(Math.max(p, 1e-9))) / (lmax - lmin || 1)) * priceH;
      }
      return PAD_TOP + ((max - p) / (max - min || 1)) * priceH;
    },
    [max, min, priceH, logScale]
  );

  const first = visible[0];
  const last = visible[n - 1];
  const baseline = showPrev && prevClose ? prevClose : first?.c ?? 0;
  const rangeUp = last ? last.c >= baseline : true;
  const lineColor = rangeUp ? UP : DOWN;
  const changePct = last && baseline ? ((last.c - baseline) / baseline) * 100 : 0;

  const areaPath = useMemo(() => {
    if (!n) return { line: "", fill: "" };
    let d = `M ${x(0).toFixed(2)} ${y(visible[0].c).toFixed(2)}`;
    for (let i = 1; i < n; i++) d += ` L ${x(i).toFixed(2)} ${y(visible[i].c).toFixed(2)}`;
    const bottom = PAD_TOP + priceH;
    const fill = `${d} L ${x(n - 1).toFixed(2)} ${bottom} L ${x(0).toFixed(2)} ${bottom} Z`;
    return { line: d, fill };
  }, [visible, n, x, y, priceH]);

  const indicatorPaths = useMemo(() => {
    return indicatorSeries.map((s) => {
      let d = "";
      for (let i = 0; i < n; i++) {
        const v = s.values[win.s + i];
        if (v == null) continue;
        d += `${d ? " L" : "M"} ${x(i).toFixed(2)} ${y(v).toFixed(2)}`;
      }
      return { ...s, d };
    });
  }, [indicatorSeries, n, win.s, x, y]);

  const gridLines = useMemo(() => {
    const lines: { yPos: number; label: string }[] = [];
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const frac = i / steps;
      const p = logScale && min > 0 ? Math.exp(Math.log(min) + (Math.log(max) - Math.log(min)) * frac) : min + (max - min) * frac;
      lines.push({ yPos: y(p), label: fmtPrice(p) });
    }
    return lines;
  }, [min, max, y, logScale]);

  const xTicks = useMemo(() => {
    if (n < 2) return [] as { xPos: number; label: string; anchor: "start" | "middle" | "end" }[];
    const count = Math.min(6, Math.max(2, Math.floor(plotW / 130)));
    const ticks: { xPos: number; label: string; anchor: "start" | "middle" | "end" }[] = [];
    for (let i = 0; i < count; i++) {
      const idx = Math.round((i / (count - 1)) * (n - 1));
      ticks.push({
        xPos: x(idx),
        label: timeLabel(visible[idx].t, range, zoomed),
        anchor: i === 0 ? "start" : i === count - 1 ? "end" : "middle",
      });
    }
    return ticks;
  }, [visible, n, plotW, range, x, zoomed]);

  const candleW = Math.max(1.5, Math.min(16, (plotW / Math.max(n, 1)) * 0.62));

  const hb = hover != null ? visible[hover] : null;
  const tooltipLeft = hb && hover != null ? Math.min(Math.max(x(hover) - 80, 4), plotW - 172) : 0;

  const toggleIndicator = (key: IndicatorKey) => {
    setIndicators((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div ref={rootRef} className={isFs ? "bg-surface" : undefined}>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-white/5">
        <div className="flex gap-0.5">
          {RANGE_KEYS.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
                range === r
                  ? "bg-yellow-400/15 text-yellow-300 border border-yellow-400/30"
                  : "text-gray-500 hover:text-gray-200 border border-transparent"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-0.5 rounded-lg border border-white/10 p-0.5">
          <button onClick={() => zoomAt(1 / 1.5, 0.5)} aria-label="Zoom in"
            className="px-2 py-1 rounded-md text-gray-400 hover:text-yellow-300 text-sm font-bold transition-colors">+</button>
          <button onClick={() => zoomAt(1.5, 0.5)} aria-label="Zoom out"
            className="px-2 py-1 rounded-md text-gray-400 hover:text-yellow-300 text-sm font-bold transition-colors">−</button>
          <button onClick={() => { setView(null); setHover(null); }} aria-label="Reset zoom"
            className={`px-2 py-1 rounded-md text-xs font-bold transition-colors ${zoomed ? "text-yellow-300" : "text-gray-600"}`}>⟲</button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {last && !loading && (
            <span className={`hidden sm:inline font-mono text-xs font-bold ${rangeUp ? "text-green-400" : "text-red-400"}`}>
              {zoomed ? "view" : range} {rangeUp ? "+" : ""}{changePct.toFixed(2)}%
            </span>
          )}

          {/* Indicators */}
          <div className="relative">
            <button
              onClick={() => setIndicatorsOpen((o) => !o)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                indicators.size > 0 || indicatorsOpen
                  ? "text-yellow-300 border-yellow-400/40 bg-yellow-400/10"
                  : "text-gray-500 border-white/10 hover:text-gray-300"
              }`}
            >
              ƒ Indicators{indicators.size > 0 ? ` (${indicators.size})` : ""}
            </button>
            {indicatorsOpen && (
              <div className="absolute right-0 top-full mt-1.5 z-30 w-44 rounded-xl border border-yellow-500/20 bg-surface shadow-[0_16px_40px_rgba(0,0,0,0.7)] p-1.5">
                {INDICATORS.map((ind) => (
                  <button
                    key={ind.key}
                    onClick={() => toggleIndicator(ind.key)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs font-semibold text-gray-300 hover:bg-white/[0.05] transition-colors"
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[9px] text-black font-bold`}
                      style={indicators.has(ind.key) ? { background: ind.color, borderColor: ind.color } : { borderColor: "rgba(255,255,255,0.25)" }}
                    >
                      {indicators.has(ind.key) ? "✓" : ""}
                    </span>
                    <span style={{ color: indicators.has(ind.key) ? ind.color : undefined }}>{ind.label}</span>
                  </button>
                ))}
                <div className="my-1 border-t border-white/5" />
                <button
                  onClick={() => setShowVolume((v) => !v)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs font-semibold text-gray-300 hover:bg-white/[0.05] transition-colors"
                >
                  <span
                    className="w-3.5 h-3.5 rounded border flex items-center justify-center text-[9px] text-black font-bold"
                    style={showVolume ? { background: GOLD, borderColor: GOLD } : { borderColor: "rgba(255,255,255,0.25)" }}
                  >
                    {showVolume ? "✓" : ""}
                  </span>
                  Volume
                </button>
              </div>
            )}
          </div>

          {/* Log scale */}
          <button
            onClick={() => setLogScale((v) => !v)}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-colors ${
              logScale ? "text-yellow-300 border-yellow-400/40 bg-yellow-400/10" : "text-gray-500 border-white/10 hover:text-gray-300"
            }`}
          >
            log
          </button>

          {/* Style toggle */}
          <div className="flex gap-0.5 rounded-lg border border-white/10 p-0.5">
            <button
              onClick={() => setStyle("area")}
              aria-label="Line chart"
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                style === "area" ? "bg-yellow-400/15 text-yellow-300" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              Line
            </button>
            <button
              onClick={() => setStyle("candles")}
              aria-label="Candlestick chart"
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                style === "candles" ? "bg-yellow-400/15 text-yellow-300" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              Candles
            </button>
          </div>

          {/* Fullscreen */}
          <button
            onClick={() => {
              if (document.fullscreenElement) document.exitFullscreen();
              else rootRef.current?.requestFullscreen?.();
            }}
            aria-label="Fullscreen"
            className="px-2 py-1 rounded-lg text-xs border border-white/10 text-gray-500 hover:text-yellow-300 transition-colors"
          >
            {isFs ? "✕" : "⛶"}
          </button>
        </div>
      </div>

      {/* Indicator legend */}
      {indicatorPaths.length > 0 && (
        <div className="flex items-center gap-3 px-4 pt-2 -mb-1">
          {indicatorPaths.map((s) => {
            const ind = INDICATORS.find((i) => i.key === s.key)!;
            return (
              <span key={s.key} className="flex items-center gap-1.5 text-[10px] font-mono font-bold" style={{ color: s.color }}>
                <span className="w-3 h-0.5 rounded" style={{ background: s.color }} />
                {ind.label}
              </span>
            );
          })}
        </div>
      )}

      {/* Plot */}
      <div
        ref={plotRef}
        className="relative select-none touch-none"
        style={{ height: chartH, cursor: zoomed ? "grab" : "crosshair" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={(e) => { onPointerUp(e); setHover(null); }}
        onDoubleClick={() => { setView(null); setHover(null); }}
      >
        {loading ? (
          <div className="absolute inset-3 rounded-xl bg-white/[0.03] animate-pulse" />
        ) : error || !n ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <p className="text-gray-500 text-sm">No chart data for {symbol}</p>
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              className="px-4 py-2 rounded-lg border border-yellow-400/40 text-yellow-300 text-xs font-bold hover:bg-yellow-400/10 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <svg width={width} height={chartH} className="block">
            <defs>
              <linearGradient id={`areaFill-${rangeUp ? "up" : "down"}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity="0.28" />
                <stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Grid + price axis */}
            {gridLines.map((g, i) => (
              <g key={i}>
                <line x1={0} x2={plotW} y1={g.yPos} y2={g.yPos} stroke="rgba(255,255,255,0.05)" />
                <text
                  x={plotW + 8}
                  y={g.yPos + 3.5}
                  fill="rgba(156,163,175,0.7)"
                  fontSize="10.5"
                  fontFamily="ui-monospace, monospace"
                >
                  {g.label}
                </text>
              </g>
            ))}

            {/* Previous close (1D) */}
            {showPrev && prevClose && (
              <line
                x1={0}
                x2={plotW}
                y1={y(prevClose)}
                y2={y(prevClose)}
                stroke="rgba(156,163,175,0.45)"
                strokeDasharray="3 4"
              />
            )}

            {/* Volume pane */}
            {showVolume &&
              visible.map((b, i) =>
                b.v > 0 ? (
                  <rect
                    key={`v${i}`}
                    x={x(i) - candleW / 2}
                    y={volTop + (1 - b.v / maxVol) * VOL_H}
                    width={candleW}
                    height={(b.v / maxVol) * VOL_H}
                    fill={b.c >= b.o ? UP : DOWN}
                    opacity={hover === i ? 0.75 : 0.28}
                  />
                ) : null
              )}

            {/* Price series */}
            {style === "area" ? (
              <>
                <path d={areaPath.fill} fill={`url(#areaFill-${rangeUp ? "up" : "down"})`} />
                <path d={areaPath.line} fill="none" stroke={lineColor} strokeWidth="2" strokeLinejoin="round" />
              </>
            ) : (
              visible.map((b, i) => {
                const up = b.c >= b.o;
                const color = up ? UP : DOWN;
                const bodyTop = y(Math.max(b.o, b.c));
                const bodyH = Math.max(1, Math.abs(y(b.o) - y(b.c)));
                return (
                  <g key={`c${i}`} opacity={hover != null && hover !== i ? 0.75 : 1}>
                    <line x1={x(i)} x2={x(i)} y1={y(b.h)} y2={y(b.l)} stroke={color} strokeWidth="1" />
                    <rect x={x(i) - candleW / 2} y={bodyTop} width={candleW} height={bodyH} fill={color} rx={candleW > 4 ? 1 : 0} />
                  </g>
                );
              })
            )}

            {/* Indicator overlays */}
            {indicatorPaths.map((s) =>
              s.d ? <path key={s.key} d={s.d} fill="none" stroke={s.color} strokeWidth="1.5" opacity="0.9" /> : null
            )}

            {/* Last price pill */}
            {last && (
              <g>
                <rect x={plotW + 2} y={y(last.c) - 9} width={AXIS_RIGHT - 4} height={18} rx={4} fill={GOLD} />
                <text
                  x={plotW + AXIS_RIGHT / 2}
                  y={y(last.c) + 3.5}
                  textAnchor="middle"
                  fill="#000"
                  fontSize="10.5"
                  fontWeight="700"
                  fontFamily="ui-monospace, monospace"
                >
                  {fmtPrice(last.c)}
                </text>
              </g>
            )}

            {/* X axis */}
            {xTicks.map((t, i) => (
              <text
                key={i}
                x={t.xPos}
                y={chartH - 7}
                textAnchor={t.anchor}
                fill="rgba(156,163,175,0.6)"
                fontSize="10.5"
                fontFamily="ui-monospace, monospace"
              >
                {t.label}
              </text>
            ))}

            {/* Crosshair */}
            {hb && hover != null && (
              <g pointerEvents="none">
                <line x1={x(hover)} x2={x(hover)} y1={PAD_TOP} y2={volTop + VOL_H} stroke="rgba(255,214,10,0.45)" strokeDasharray="3 3" />
                <line x1={0} x2={plotW} y1={y(hb.c)} y2={y(hb.c)} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                <circle cx={x(hover)} cy={y(hb.c)} r="3.5" fill={lineColor} stroke="#161410" strokeWidth="1.5" />
              </g>
            )}
          </svg>
        )}

        {/* Tooltip */}
        {hb && hover != null && !loading && (
          <div
            className="absolute z-10 pointer-events-none rounded-lg border border-yellow-400/25 bg-black/90 backdrop-blur px-3 py-2 font-mono"
            style={{ left: tooltipLeft, top: 8, width: 168 }}
          >
            <p className="text-[10px] text-gray-400 mb-1">{tooltipLabel(hb.t)}</p>
            {style === "candles" ? (
              <div className="grid grid-cols-2 gap-x-3 text-[11px] tabular-nums">
                <span className="text-gray-500">O <span className="text-gray-100">{fmtPrice(hb.o)}</span></span>
                <span className="text-gray-500">H <span className="text-gray-100">{fmtPrice(hb.h)}</span></span>
                <span className="text-gray-500">L <span className="text-gray-100">{fmtPrice(hb.l)}</span></span>
                <span className="text-gray-500">C <span className={hb.c >= hb.o ? "text-green-400" : "text-red-400"}>{fmtPrice(hb.c)}</span></span>
              </div>
            ) : (
              <p className="text-sm font-bold tabular-nums" style={{ color: lineColor }}>
                ${fmtPrice(hb.c)}
              </p>
            )}
            {hb.v > 0 && <p className="text-[10px] text-gray-500 mt-0.5">Vol {fmtVol(hb.v)}</p>}
          </div>
        )}

        {/* Zoom hint */}
        {!loading && !error && n > 0 && !zoomed && hover == null && (
          <span className="absolute bottom-7 left-3 text-[10px] text-gray-600 font-mono pointer-events-none">
            scroll to zoom · drag to pan
          </span>
        )}
      </div>
    </div>
  );
};

export default TerminalChart;
