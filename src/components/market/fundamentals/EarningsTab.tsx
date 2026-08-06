"use client";

// Earnings & Dividends tab — upcoming earnings, EPS surprises, earnings
// history, dividend record and stock splits.

import React from "react";
import {
  useDataset,
  fmtMoney,
  fmtUsd,
  fmtNum,
  fmtPct,
  fmtDate,
  fmtDateShort,
  SectionCard,
  DeltaPill,
  Skeleton,
  EmptyNote,
  Sparkbars,
} from "./shared";

/* ------------------------------- helpers ------------------------------- */

const isNum = (v: any): v is number => typeof v === "number" && isFinite(v);

const beatClass = (actual?: number | null, est?: number | null): string => {
  if (!isNum(actual)) return "text-gray-100";
  if (!isNum(est)) return "text-gray-100";
  return actual >= est ? "text-green-400" : "text-red-400";
};

const surprisePct = (actual?: number | null, est?: number | null): number | null => {
  if (!isNum(actual) || !isNum(est) || est === 0) return null;
  return (actual - est) / Math.abs(est);
};

const daysUntil = (dateStr: string): number => {
  const target = new Date(String(dateStr).replace(" ", "T")).getTime();
  const now = new Date().getTime();
  return Math.max(0, Math.ceil((target - now) / 86400000));
};

const timeBadgeLabel = (time?: string | null): string | null => {
  if (time === "amc") return "After market close";
  if (time === "bmo") return "Before market open";
  return null;
};

/* --------------------------- EPS bar chart ----------------------------- */

const EpsBarChart: React.FC<{
  rows: { date?: string; actualEarningResult?: number; estimatedEarning?: number }[];
}> = ({ rows }) => {
  const W = 480;
  const H = 140;
  const padTop = 8;
  const labelH = 18;
  const plotH = H - padTop - labelH;

  const vals: number[] = [];
  rows.forEach((r) => {
    if (isNum(r.estimatedEarning)) vals.push(r.estimatedEarning);
    if (isNum(r.actualEarningResult)) vals.push(r.actualEarningResult);
  });
  if (vals.length === 0) return null;

  const max = Math.max(0, ...vals);
  const min = Math.min(0, ...vals);
  const range = max - min || 1;
  const yOf = (v: number) => padTop + ((max - v) / range) * plotH;
  const zeroY = yOf(0);

  const n = rows.length;
  const slot = W / n;
  const barW = Math.min(14, slot * 0.28);
  const gap = 3;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto"
      role="img"
      aria-label="EPS estimate vs actual by quarter"
    >
      {/* zero line */}
      <line
        x1={0}
        x2={W}
        y1={zeroY}
        y2={zeroY}
        className="stroke-white/15"
        strokeWidth={1}
      />
      {rows.map((r, i) => {
        const cx = slot * i + slot / 2;
        const est = isNum(r.estimatedEarning) ? r.estimatedEarning : null;
        const act = isNum(r.actualEarningResult) ? r.actualEarningResult : null;
        const beat = act !== null && est !== null && act >= est;
        return (
          <g key={i}>
            {est !== null && (
              <rect
                x={cx - barW - gap / 2}
                y={Math.min(yOf(est), zeroY)}
                width={barW}
                height={Math.max(Math.abs(yOf(est) - zeroY), 1.5)}
                rx={2}
                className="fill-white/20"
              />
            )}
            {act !== null && (
              <rect
                x={cx + gap / 2}
                y={Math.min(yOf(act), zeroY)}
                width={barW}
                height={Math.max(Math.abs(yOf(act) - zeroY), 1.5)}
                rx={2}
                className={beat ? "fill-green-400" : "fill-red-400"}
              />
            )}
            <text
              x={cx}
              y={H - 4}
              textAnchor="middle"
              className="fill-gray-500 font-mono"
              style={{ fontSize: 10 }}
            >
              {fmtDateShort(r.date)}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

/* ------------------------------ component ------------------------------ */

const EarningsTab: React.FC<{ symbol: string; quote?: any }> = ({ symbol, quote }) => {
  const earnings = useDataset<any[]>(symbol, "earnings");
  const surprises = useDataset<any[]>(symbol, "surprises");
  const dividends = useDataset<any[]>(symbol, "dividends");
  const splits = useDataset<any[]>(symbol, "splits");

  /* next earnings: eps === null and date in the future, soonest first */
  const now = new Date().getTime();
  const upcoming = (earnings.data ?? [])
    .filter(
      (r: any) =>
        r?.eps == null &&
        r?.date &&
        new Date(String(r.date).replace(" ", "T")).getTime() > now
    )
    .sort(
      (a: any, b: any) =>
        new Date(String(a.date).replace(" ", "T")).getTime() -
        new Date(String(b.date).replace(" ", "T")).getTime()
    );
  const next = upcoming[0];

  /* surprises: last 8, reversed to chronological (API is newest-first) */
  const surpriseRows = (surprises.data ?? []).slice(0, 8).reverse();

  /* earnings history: reported quarters only */
  const historyRows = (earnings.data ?? []).filter((r: any) => r?.eps != null).slice(0, 8);

  /* dividends */
  const divs = dividends.data ?? [];
  const lastDiv = divs[0];
  const ttmSum = divs
    .slice(0, 4)
    .reduce((s: number, d: any) => s + (isNum(d?.adjDividend) ? d.adjDividend : 0), 0);
  const hasTtm = divs.slice(0, 4).some((d: any) => isNum(d?.adjDividend));
  const divYield =
    hasTtm && isNum(quote?.price) && quote.price > 0 ? ttmSum / quote.price : null;

  const splitRows = splits.data ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 1 — Next Earnings */}
      <SectionCard title="Next Earnings" subtitle="Upcoming report on the calendar">
        {earnings.loading ? (
          <Skeleton rows={5} />
        ) : !next ? (
          <EmptyNote text="No upcoming earnings on the calendar." />
        ) : (
          <div className="p-4 md:p-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono tabular-nums text-2xl font-bold text-yellow-300">
                {fmtDate(next.date)}
              </span>
              <span className="text-xs font-mono tabular-nums text-gray-400 px-2 py-1 rounded-md bg-white/[0.04] border border-white/10">
                in {daysUntil(next.date)} {daysUntil(next.date) === 1 ? "day" : "days"}
              </span>
              {timeBadgeLabel(next.time) && (
                <span className="text-[11px] font-bold text-yellow-300 px-2 py-1 rounded-md bg-yellow-400/10 border border-yellow-400/20">
                  {timeBadgeLabel(next.time)}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-5">
              <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
                <p className="text-xs text-gray-500">Est. EPS</p>
                <p className="font-mono tabular-nums text-lg text-gray-100 mt-1">
                  {fmtNum(next.epsEstimated)}
                </p>
              </div>
              <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
                <p className="text-xs text-gray-500">Est. Revenue</p>
                <p className="font-mono tabular-nums text-lg text-gray-100 mt-1">
                  {fmtMoney(next.revenueEstimated)}
                </p>
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      {/* 2 — EPS: Estimate vs Actual */}
      <SectionCard title="EPS: Estimate vs Actual" subtitle="Last 8 reported quarters">
        {surprises.loading ? (
          <Skeleton rows={6} />
        ) : surpriseRows.length === 0 ? (
          <EmptyNote text="No earnings surprises on record." />
        ) : (
          <div className="p-4 md:p-5">
            <div className="flex items-center gap-4 mb-3">
              <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-white/20" />
                Estimate
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-400" />
                Actual (beat)
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-400" />
                Actual (miss)
              </span>
            </div>
            <EpsBarChart rows={surpriseRows} />
            <div className="mt-3">
              {surpriseRows
                .slice()
                .reverse()
                .map((r: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0"
                  >
                    <span className="text-xs text-gray-500">{fmtDate(r.date)}</span>
                    <span className="flex items-center gap-3">
                      <span className="font-mono tabular-nums text-sm text-gray-400">
                        {fmtNum(r.estimatedEarning)}
                        <span className="text-gray-600 mx-1">→</span>
                        <span className={beatClass(r.actualEarningResult, r.estimatedEarning)}>
                          {fmtNum(r.actualEarningResult)}
                        </span>
                      </span>
                      <DeltaPill v={surprisePct(r.actualEarningResult, r.estimatedEarning)} />
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </SectionCard>

      {/* 3 — Earnings History */}
      <SectionCard title="Earnings History" subtitle="Reported EPS and revenue vs estimates">
        {earnings.loading ? (
          <Skeleton rows={8} />
        ) : historyRows.length === 0 ? (
          <EmptyNote text="No reported earnings on record." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-[11px] uppercase tracking-wider text-gray-500 font-medium text-left py-2 px-3">
                    Date
                  </th>
                  <th className="text-[11px] uppercase tracking-wider text-gray-500 font-medium text-left py-2 px-3">
                    Fiscal Period
                  </th>
                  <th className="text-[11px] uppercase tracking-wider text-gray-500 font-medium text-right py-2 px-3">
                    EPS Est / Act
                  </th>
                  <th className="text-[11px] uppercase tracking-wider text-gray-500 font-medium text-right py-2 px-3">
                    Revenue Est / Act
                  </th>
                </tr>
              </thead>
              <tbody>
                {historyRows.map((r: any, i: number) => (
                  <tr
                    key={i}
                    className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-2.5 px-3 whitespace-nowrap text-gray-100">
                      {fmtDate(r.date)}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-gray-400">
                      {fmtDateShort(r.fiscalDateEnding)}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono tabular-nums">
                      <span className="text-gray-500">{fmtNum(r.epsEstimated)}</span>
                      <span className="text-gray-600 mx-1">/</span>
                      <span className={beatClass(r.eps, r.epsEstimated)}>{fmtNum(r.eps)}</span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono tabular-nums">
                      <span className="text-gray-500">{fmtMoney(r.revenueEstimated)}</span>
                      <span className="text-gray-600 mx-1">/</span>
                      <span className={beatClass(r.revenue, r.revenueEstimated)}>
                        {fmtMoney(r.revenue)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* 4 — Dividends */}
      <SectionCard title="Dividends" subtitle="Cash dividend history">
        {dividends.loading ? (
          <Skeleton rows={8} />
        ) : divs.length === 0 ? (
          <EmptyNote text="No dividends on record." />
        ) : (
          <div>
            <div className="p-4 md:p-5 border-b border-white/5">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-gray-500">Last Dividend</p>
                  <p className="font-mono tabular-nums text-lg text-gray-100 mt-1">
                    {fmtUsd(lastDiv?.adjDividend)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Trailing 12M</p>
                  <p className="font-mono tabular-nums text-lg text-gray-100 mt-1">
                    {hasTtm ? fmtUsd(ttmSum) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Yield</p>
                  <p className="font-mono tabular-nums text-lg text-yellow-300 mt-1">
                    {fmtPct(divYield)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-4">
                <span className="text-[10px] text-gray-600 uppercase tracking-wider">
                  History
                </span>
                <Sparkbars
                  values={divs
                    .slice()
                    .reverse()
                    .map((d: any) => (isNum(d?.adjDividend) ? d.adjDividend : 0))}
                  width={160}
                  height={24}
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-[11px] uppercase tracking-wider text-gray-500 font-medium text-left py-2 px-3">
                      Ex-Date
                    </th>
                    <th className="text-[11px] uppercase tracking-wider text-gray-500 font-medium text-right py-2 px-3">
                      Amount
                    </th>
                    <th className="text-[11px] uppercase tracking-wider text-gray-500 font-medium text-right py-2 px-3">
                      Record
                    </th>
                    <th className="text-[11px] uppercase tracking-wider text-gray-500 font-medium text-right py-2 px-3">
                      Payment
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {divs.map((d: any, i: number) => (
                    <tr
                      key={i}
                      className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-2.5 px-3 whitespace-nowrap text-gray-100">
                        {fmtDate(d.date)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono tabular-nums text-gray-100">
                        {fmtUsd(d.adjDividend)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono tabular-nums text-gray-400">
                        {fmtDateShort(d.recordDate)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono tabular-nums text-gray-400">
                        {fmtDateShort(d.paymentDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </SectionCard>

      {/* 5 — Stock Splits */}
      <SectionCard title="Stock Splits" subtitle="Historical share splits">
        {splits.loading ? (
          <Skeleton rows={4} />
        ) : splitRows.length === 0 ? (
          <EmptyNote text="No splits on record." />
        ) : (
          <div className="px-4 md:px-5 py-2">
            {splitRows.map((s: any, i: number) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 py-2.5 border-b border-white/5 last:border-0"
              >
                <span className="font-mono tabular-nums text-sm text-gray-100">
                  {s?.numerator ?? "?"}-for-{s?.denominator ?? "?"}{" "}
                  <span className="text-gray-500 font-sans text-xs">split</span>
                </span>
                <span className="text-xs text-gray-500">{fmtDate(s?.date)}</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default EarningsTab;
