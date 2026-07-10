"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Custom chart engine — no third-party widgets. Candlesticks + area,
// crosshair tooltip, volume pane, range tabs. Data via /api/market/chart
// (Twelve Data, FMP for indices).

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
const timeLabel = (t: string, range: RangeKey): string => {
  const mon = MONTHS[parseInt(t.slice(5, 7), 10) - 1] || "";
  const day = parseInt(t.slice(8, 10), 10);
  const hhmm = t.length > 11 ? t.slice(11, 16) : "";
  if (range === "1D") {
    const h = parseInt(hhmm.slice(0, 2), 10);
    const m = hhmm.slice(3, 5);
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${m} ${h < 12 ? "AM" : "PM"}`;
  }
  if (range === "5D" || range === "1M") return `${mon} ${day}`;
  if (range === "6M") return `${mon} ${day}`;
  return `${mon} ${t.slice(2, 4)}′`;
};

const tooltipLabel = (t: string): string => {
  const mon = MONTHS[parseInt(t.slice(5, 7), 10) - 1] || "";
  const day = parseInt(t.slice(8, 10), 10);
  const year = t.slice(0, 4);
  const hhmm = t.length > 11 ? t.slice(11, 16) : "";
  return hhmm ? `${mon} ${day}, ${year} · ${hhmm} ET` : `${mon} ${day}, ${year}`;
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
  const [hover, setHover] = useState<number | null>(null);
  const [width, setWidth] = useState(800);
  const containerRef = useRef<HTMLDivElement>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    setHover(null);
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

  // ---- geometry ----
  const PAD_TOP = 14;
  const AXIS_RIGHT = 66;
  const AXIS_BOTTOM = 24;
  const VOL_H = Math.round(height * 0.14);
  const plotW = Math.max(50, width - AXIS_RIGHT);
  const priceH = height - PAD_TOP - AXIS_BOTTOM - VOL_H - 8;
  const volTop = PAD_TOP + priceH + 8;

  const n = bars.length;
  const showPrev = range === "1D" && prevClose != null && prevClose > 0;

  const { min, max, maxVol } = useMemo(() => {
    if (!n) return { min: 0, max: 1, maxVol: 1 };
    let lo = Infinity;
    let hi = -Infinity;
    let mv = 0;
    for (const b of bars) {
      const bLo = style === "candles" ? b.l : b.c;
      const bHi = style === "candles" ? b.h : b.c;
      if (bLo < lo) lo = bLo;
      if (bHi > hi) hi = bHi;
      if (b.v > mv) mv = b.v;
    }
    if (showPrev && prevClose) {
      if (prevClose < lo) lo = prevClose;
      if (prevClose > hi) hi = prevClose;
    }
    const pad = (hi - lo) * 0.06 || hi * 0.01 || 1;
    return { min: lo - pad, max: hi + pad, maxVol: mv || 1 };
  }, [bars, style, showPrev, prevClose, n]);

  const x = useCallback((i: number) => ((i + 0.5) / Math.max(n, 1)) * plotW, [n, plotW]);
  const y = useCallback(
    (p: number) => PAD_TOP + ((max - p) / (max - min)) * priceH,
    [max, min, priceH]
  );

  const first = bars[0];
  const last = bars[n - 1];
  const baseline = showPrev && prevClose ? prevClose : first?.c ?? 0;
  const rangeUp = last ? last.c >= baseline : true;
  const lineColor = rangeUp ? UP : DOWN;
  const changePct = last && baseline ? ((last.c - baseline) / baseline) * 100 : 0;

  const areaPath = useMemo(() => {
    if (!n) return { line: "", fill: "" };
    let d = `M ${x(0).toFixed(2)} ${y(bars[0].c).toFixed(2)}`;
    for (let i = 1; i < n; i++) d += ` L ${x(i).toFixed(2)} ${y(bars[i].c).toFixed(2)}`;
    const bottom = PAD_TOP + priceH;
    const fill = `${d} L ${x(n - 1).toFixed(2)} ${bottom} L ${x(0).toFixed(2)} ${bottom} Z`;
    return { line: d, fill };
  }, [bars, n, x, y, priceH]);

  const gridLines = useMemo(() => {
    const lines: { yPos: number; label: string }[] = [];
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const p = min + ((max - min) * i) / steps;
      lines.push({ yPos: y(p), label: fmtPrice(p) });
    }
    return lines;
  }, [min, max, y]);

  const xTicks = useMemo(() => {
    if (n < 2) return [] as { xPos: number; label: string; anchor: "start" | "middle" | "end" }[];
    const count = Math.min(6, Math.max(2, Math.floor(plotW / 130)));
    const ticks: { xPos: number; label: string; anchor: "start" | "middle" | "end" }[] = [];
    for (let i = 0; i < count; i++) {
      const idx = Math.round((i / (count - 1)) * (n - 1));
      ticks.push({
        xPos: x(idx),
        label: timeLabel(bars[idx].t, range),
        anchor: i === 0 ? "start" : i === count - 1 ? "end" : "middle",
      });
    }
    return ticks;
  }, [bars, n, plotW, range, x]);

  const candleW = Math.max(1.5, Math.min(14, (plotW / Math.max(n, 1)) * 0.62));

  const onMove = (clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || !n) return;
    const mx = clientX - rect.left;
    const idx = Math.round((mx / plotW) * n - 0.5);
    setHover(Math.max(0, Math.min(n - 1, idx)));
  };

  const hb = hover != null ? bars[hover] : null;
  const tooltipLeft = hb && hover != null ? Math.min(Math.max(x(hover) - 80, 4), plotW - 172) : 0;

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-white/5">
        <div className="flex gap-0.5">
          {RANGE_KEYS.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
                range === r
                  ? "bg-yellow-400/15 text-yellow-300 border border-yellow-400/30"
                  : "text-gray-500 hover:text-gray-200 border border-transparent"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3">
          {last && !loading && (
            <span className={`font-mono text-xs font-bold ${rangeUp ? "text-green-400" : "text-red-400"}`}>
              {range} {rangeUp ? "+" : ""}
              {changePct.toFixed(2)}%
            </span>
          )}
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
        </div>
      </div>

      {/* Plot */}
      <div
        ref={containerRef}
        className="relative select-none"
        style={{ height }}
        onMouseMove={(e) => onMove(e.clientX)}
        onMouseLeave={() => setHover(null)}
        onTouchMove={(e) => e.touches[0] && onMove(e.touches[0].clientX)}
        onTouchEnd={() => setHover(null)}
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
          <svg width={width} height={height} className="block">
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
            {bars.map((b, i) =>
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
              bars.map((b, i) => {
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

            {/* Last price pill */}
            {last && (
              <g>
                <rect
                  x={plotW + 2}
                  y={y(last.c) - 9}
                  width={AXIS_RIGHT - 4}
                  height={18}
                  rx={4}
                  fill={GOLD}
                />
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
                y={height - 7}
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
                <circle cx={x(hover)} cy={y(hb.c)} r="3.5" fill={lineColor} stroke="#0b0b09" strokeWidth="1.5" />
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
      </div>
    </div>
  );
};

export default TerminalChart;
