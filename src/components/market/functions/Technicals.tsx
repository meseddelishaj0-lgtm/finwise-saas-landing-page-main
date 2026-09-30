"use client";

import React, { useEffect, useMemo, useState } from "react";
import { FnPanel, Loading, Empty, th, td, fmtP, fmtPctS, tone, fetchBars, isNum } from "./ui";
import { Bar, smaOf, emaOf, rsiOf, macdOf, stochK, cciOf, atrOf, returnsOf, annualVol, maxDrawdown } from "./ta";

// TECH — technical summary from one year of daily bars: moving-average and
// oscillator signals rolled into a Buy/Sell gauge, pivots, trailing
// performance and risk. Computed client-side; no extra API credits.

type Signal = "Buy" | "Sell" | "Neutral";

const sigClass = (s: Signal) =>
  s === "Buy" ? "text-green-400 bg-green-400/10" : s === "Sell" ? "text-red-400 bg-red-400/10" : "text-gray-400 bg-white/5";

const verdict = (score: number): { label: string; cls: string } => {
  if (score >= 0.5) return { label: "Strong Buy", cls: "text-green-400" };
  if (score >= 0.15) return { label: "Buy", cls: "text-green-400" };
  if (score <= -0.5) return { label: "Strong Sell", cls: "text-red-400" };
  if (score <= -0.15) return { label: "Sell", cls: "text-red-400" };
  return { label: "Neutral", cls: "text-gray-300" };
};

const last = (s: (number | null)[]) => {
  for (let i = s.length - 1; i >= 0; i--) if (s[i] != null) return s[i] as number;
  return null;
};

const Gauge: React.FC<{ title: string; buy: number; sell: number; neutral: number }> = ({ title, buy, sell, neutral }) => {
  const total = buy + sell + neutral || 1;
  const score = (buy - sell) / total;
  const v = verdict(score);
  const angle = -90 + ((score + 1) / 2) * 180;
  const gid = `gauge-${title.replace(/\W+/g, "-")}`;
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-center">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{title}</p>
      <svg viewBox="0 0 200 110" className="w-full max-w-[220px] mx-auto mt-2">
        <defs>
          <linearGradient id={gid} x1="0" x2="1">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="50%" stopColor="#6b7280" />
            <stop offset="100%" stopColor="#4ade80" />
          </linearGradient>
        </defs>
        <path d="M 15 100 A 85 85 0 0 1 185 100" fill="none" stroke={`url(#${gid})`} strokeWidth="12" strokeLinecap="round" opacity="0.8" />
        <g transform={`rotate(${angle} 100 100)`}>
          <line x1="100" y1="100" x2="100" y2="28" stroke="#FFD60A" strokeWidth="3" strokeLinecap="round" />
        </g>
        <circle cx="100" cy="100" r="6" fill="#FFD60A" />
      </svg>
      <p className={`text-lg font-black ${v.cls}`}>{v.label}</p>
      <p className="mt-1 text-[11px] font-mono text-gray-500">
        <span className="text-green-400">Buy {buy}</span> · Neutral {neutral} · <span className="text-red-400">Sell {sell}</span>
      </p>
    </div>
  );
};

const Technicals: React.FC<{ symbol: string }> = ({ symbol }) => {
  const [bars, setBars] = useState<Bar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchBars(symbol, "1Y")
      .then((b) => alive && setBars(b))
      .catch(() => alive && setBars([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [symbol]);

  const a = useMemo(() => {
    if (bars.length < 30) return null;
    const closes = bars.map((b) => b.c);
    const price = closes[closes.length - 1];

    const ma = [10, 20, 50, 100, 200].flatMap((p) => {
      const s = last(smaOf(closes, p));
      const e = last(emaOf(closes, p));
      const sig = (v: number | null): Signal => (v == null ? "Neutral" : price > v ? "Buy" : price < v ? "Sell" : "Neutral");
      return [
        { name: `SMA ${p}`, value: s, signal: sig(s) },
        { name: `EMA ${p}`, value: e, signal: sig(e) },
      ];
    }).filter((r) => r.value != null);

    const rsi = last(rsiOf(closes));
    const m = macdOf(closes);
    const macdV = last(m.line);
    const macdS = last(m.signal);
    const k = last(stochK(bars));
    const cci = last(cciOf(bars));
    const hh = Math.max(...bars.slice(-14).map((b) => b.h));
    const ll = Math.min(...bars.slice(-14).map((b) => b.l));
    const willR = hh === ll ? -50 : ((hh - price) / (hh - ll)) * -100;
    const mom = closes.length > 10 ? price - closes[closes.length - 11] : null;
    const atr = last(atrOf(bars));

    const osc: { name: string; value: number | null; signal: Signal; fmt?: string }[] = [
      { name: "RSI (14)", value: rsi, signal: rsi == null ? "Neutral" : rsi < 30 ? "Buy" : rsi > 70 ? "Sell" : "Neutral" },
      { name: "MACD (12,26)", value: macdV, signal: macdV == null || macdS == null ? "Neutral" : macdV > macdS ? "Buy" : "Sell" },
      { name: "Stochastic %K (14)", value: k, signal: k == null ? "Neutral" : k < 20 ? "Buy" : k > 80 ? "Sell" : "Neutral" },
      { name: "CCI (20)", value: cci, signal: cci == null ? "Neutral" : cci < -100 ? "Buy" : cci > 100 ? "Sell" : "Neutral" },
      { name: "Williams %R (14)", value: willR, signal: willR < -80 ? "Buy" : willR > -20 ? "Sell" : "Neutral" },
      { name: "Momentum (10)", value: mom, signal: mom == null ? "Neutral" : mom > 0 ? "Buy" : mom < 0 ? "Sell" : "Neutral" },
    ];

    const prev = bars[bars.length - 2] ?? bars[bars.length - 1];
    const P = (prev.h + prev.l + prev.c) / 3;
    const pivots = {
      R3: prev.h + 2 * (P - prev.l),
      R2: P + (prev.h - prev.l),
      R1: 2 * P - prev.l,
      P,
      S1: 2 * P - prev.h,
      S2: P - (prev.h - prev.l),
      S3: prev.l - 2 * (prev.h - P),
    };

    const back = (n: number) => (closes.length > n ? (price / closes[closes.length - 1 - n] - 1) * 100 : null);
    const year = bars[bars.length - 1].t.slice(0, 4);
    const ytdBase = [...bars].reverse().find((b) => !b.t.startsWith(year));
    const perf = [
      ["1W", back(5)],
      ["1M", back(21)],
      ["3M", back(63)],
      ["6M", back(126)],
      ["YTD", ytdBase ? (price / ytdBase.c - 1) * 100 : null],
      ["1Y", (price / closes[0] - 1) * 100],
    ] as [string, number | null][];

    const rets = returnsOf(closes);
    const hi52 = Math.max(...bars.map((b) => b.h));
    const lo52 = Math.min(...bars.map((b) => b.l));

    return {
      price,
      ma,
      osc,
      pivots,
      perf,
      atr,
      vol30: annualVol(rets.slice(-30)),
      vol1y: annualVol(rets),
      mdd: maxDrawdown(closes),
      hi52,
      lo52,
      pos52: hi52 > lo52 ? ((price - lo52) / (hi52 - lo52)) * 100 : null,
    };
  }, [bars]);

  const count = (rows: { signal: Signal }[]) => ({
    buy: rows.filter((r) => r.signal === "Buy").length,
    sell: rows.filter((r) => r.signal === "Sell").length,
    neutral: rows.filter((r) => r.signal === "Neutral").length,
  });

  return (
    <FnPanel code="TECH" title="Technical Analysis" subtitle={`${symbol.replace("^", "")} · daily bars, trailing 12 months`}>
      {loading ? (
        <Loading rows={10} />
      ) : !a ? (
        <Empty text="Not enough price history for a technical read." />
      ) : (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Gauge title="Summary" {...(() => { const c1 = count(a.ma); const c2 = count(a.osc); return { buy: c1.buy + c2.buy, sell: c1.sell + c2.sell, neutral: c1.neutral + c2.neutral }; })()} />
            <Gauge title="Moving Averages" {...count(a.ma)} />
            <Gauge title="Oscillators" {...count(a.osc)} />
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {a.perf.map(([k, v]) => (
              <div key={k} className="rounded-xl border border-white/10 px-3 py-2.5 text-center">
                <p className="text-[10px] font-bold text-gray-500">{k}</p>
                <p className={`font-mono text-sm font-bold ${tone(v)}`}>{fmtPctS(v, 1)}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="rounded-xl border border-white/10 overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className={th}>Moving average</th>
                    <th className={`${th} text-right`}>Value</th>
                    <th className={`${th} text-right`}>Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {a.ma.map((r) => (
                    <tr key={r.name} className="border-b border-white/5">
                      <td className={`${td} text-gray-300`}>{r.name}</td>
                      <td className={`${td} text-right text-gray-100`}>{fmtP(r.value)}</td>
                      <td className={`${td} text-right`}>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${sigClass(r.signal)}`}>{r.signal}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-xl border border-white/10 overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className={th}>Oscillator</th>
                    <th className={`${th} text-right`}>Value</th>
                    <th className={`${th} text-right`}>Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {a.osc.map((r) => (
                    <tr key={r.name} className="border-b border-white/5">
                      <td className={`${td} text-gray-300`}>{r.name}</td>
                      <td className={`${td} text-right text-gray-100`}>{isNum(r.value) ? r.value.toFixed(2) : "—"}</td>
                      <td className={`${td} text-right`}>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${sigClass(r.signal)}`}>{r.signal}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-white/10 overflow-hidden">
                <p className={`${th} border-b border-white/10`}>Classic pivots (prior session)</p>
                {Object.entries(a.pivots).map(([k, v]) => (
                  <div key={k} className="flex justify-between px-3 py-1.5 border-b border-white/5 last:border-0 text-xs font-mono">
                    <span className={k.startsWith("R") ? "text-red-400" : k.startsWith("S") ? "text-green-400" : "text-yellow-300"}>{k}</span>
                    <span className="text-gray-100 tabular-nums">{fmtP(v)}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-white/10 overflow-hidden">
                <p className={`${th} border-b border-white/10`}>Risk</p>
                {[
                  ["ATR (14)", fmtP(a.atr)],
                  ["Volatility 30D (ann.)", `${a.vol30.toFixed(1)}%`],
                  ["Volatility 1Y (ann.)", `${a.vol1y.toFixed(1)}%`],
                  ["Max drawdown 1Y", `${a.mdd.toFixed(1)}%`],
                  ["52W range", `${fmtP(a.lo52)} – ${fmtP(a.hi52)}`],
                  ["Position in range", a.pos52 != null ? `${a.pos52.toFixed(0)}%` : "—"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between px-3 py-1.5 border-b border-white/5 last:border-0 text-xs">
                    <span className="text-gray-500">{k}</span>
                    <span className="font-mono text-gray-100 tabular-nums">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="text-[10px] text-gray-600">
            Signals are mechanical readings of standard indicators, not recommendations.
          </p>
        </div>
      )}
    </FnPanel>
  );
};

export default Technicals;
