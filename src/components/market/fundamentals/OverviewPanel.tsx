"use client";

// Overview side panel — sits to the right of the chart (~300px wide).
// Parent supplies the card wrapper; root here is a plain <div>.

import React from "react";
import Link from "next/link";
import {
  useDataset,
  fmtMoney,
  fmtCount,
  fmtUsd,
  fmtNum,
  fmtPct,
  fmtSignedPct,
  fmtDate,
  StatRow,
  Skeleton,
  RangeBar,
} from "./shared";

const isNum = (v: any): v is number => typeof v === "number" && isFinite(v);

type Row = {
  key: string;
  label: string;
  ok: boolean;
  value: React.ReactNode;
  sub?: string;
};

const GroupHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-[10px] uppercase tracking-widest text-gray-600 pt-2">
    {children}
  </div>
);

const OverviewPanel: React.FC<{
  symbol: string;
  quote?: any;
  profile?: any;
}> = ({ symbol, quote, profile }) => {
  const km = useDataset<any>(symbol, "key-metrics-ttm");
  const rt = useDataset<any>(symbol, "ratios-ttm");
  const earnings = useDataset<any[]>(symbol, "earnings");

  // Hold the skeleton until the TTM datasets settle — the quote usually lands
  // first and letting groups pop in later causes a visible layout jump.
  if (km.loading || rt.loading) {
    return <Skeleton rows={10} />;
  }

  const kmd = km.data ?? {};
  const rtd = rt.data ?? {};

  const price = quote?.price;
  const yearLow = quote?.yearLow;
  const yearHigh = quote?.yearHigh;
  const offHigh =
    isNum(price) && isNum(yearHigh) && yearHigh !== 0
      ? price / yearHigh - 1
      : null;

  const nextEarnings = (earnings.data ?? [])
    .filter((e: any) => e?.date && new Date(e.date).getTime() > new Date().getTime())
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  const peTTM = isNum(rtd.peRatioTTM) ? rtd.peRatioTTM : quote?.pe;
  const marketCap = isNum(quote?.marketCap) ? quote?.marketCap : profile?.mktCap;

  const groups: { header: string; rows: Row[] }[] = [
    {
      header: "Trading",
      rows: [
        {
          key: "prev",
          label: "Prev Close",
          ok: isNum(quote?.previousClose),
          value: fmtUsd(quote?.previousClose),
        },
        {
          key: "vol",
          label: "Volume",
          ok: isNum(quote?.volume),
          value: fmtCount(quote?.volume),
          sub: isNum(profile?.volAvg) ? `Avg ${fmtCount(profile?.volAvg)}` : undefined,
        },
        {
          key: "beta",
          label: "Beta",
          ok: isNum(profile?.beta),
          value: fmtNum(profile?.beta),
        },
        {
          key: "mcap",
          label: "Market Cap",
          ok: isNum(marketCap),
          value: fmtMoney(marketCap),
        },
      ],
    },
    {
      header: "Valuation",
      rows: [
        { key: "pe", label: "P/E TTM", ok: isNum(peTTM), value: fmtNum(peTTM) },
        {
          key: "ps",
          label: "P/S",
          ok: isNum(rtd.priceToSalesRatioTTM),
          value: fmtNum(rtd.priceToSalesRatioTTM),
        },
        {
          key: "pb",
          label: "P/B",
          ok: isNum(rtd.priceToBookRatioTTM),
          value: fmtNum(rtd.priceToBookRatioTTM),
        },
        {
          key: "ev",
          label: "EV/EBITDA",
          ok: isNum(kmd.enterpriseValueOverEBITDATTM),
          value: fmtNum(kmd.enterpriseValueOverEBITDATTM),
        },
        {
          key: "peg",
          label: "PEG",
          ok: isNum(rtd.pegRatioTTM),
          value: fmtNum(rtd.pegRatioTTM),
        },
      ],
    },
    {
      header: "Profitability",
      rows: [
        {
          key: "gm",
          label: "Gross Margin",
          ok: isNum(rtd.grossProfitMarginTTM),
          value: fmtPct(rtd.grossProfitMarginTTM),
        },
        {
          key: "nm",
          label: "Net Margin",
          ok: isNum(rtd.netProfitMarginTTM),
          value: fmtPct(rtd.netProfitMarginTTM),
        },
        {
          key: "roe",
          label: "ROE",
          ok: isNum(rtd.returnOnEquityTTM),
          value: fmtPct(rtd.returnOnEquityTTM),
        },
        {
          key: "fcfy",
          label: "FCF Yield",
          ok: isNum(kmd.freeCashFlowYieldTTM),
          value: fmtPct(kmd.freeCashFlowYieldTTM),
        },
      ],
    },
    {
      header: "Dividend",
      rows: [
        {
          key: "yield",
          label: "Yield",
          // FMP typo field: "dividendYielTTM" (no "d") — verified in sample.
          ok: isNum(rtd.dividendYielTTM),
          value: fmtPct(rtd.dividendYielTTM),
        },
        {
          key: "payout",
          label: "Payout",
          ok: isNum(rtd.payoutRatioTTM),
          value: fmtPct(rtd.payoutRatioTTM),
        },
        {
          key: "lastdiv",
          label: "Last Div",
          ok: isNum(profile?.lastDiv),
          value: fmtUsd(profile?.lastDiv),
        },
      ],
    },
  ];

  return (
    <div className="p-4 space-y-4">
      {isNum(yearLow) && isNum(yearHigh) && isNum(price) && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-gray-500">52W RANGE</span>
            {isNum(offHigh) && (
              <span className="text-[11px] font-mono tabular-nums text-gray-400">
                {fmtSignedPct(offHigh)}
              </span>
            )}
          </div>
          <RangeBar
            low={yearLow}
            high={yearHigh}
            value={price}
            labelLow={fmtUsd(yearLow)}
            labelHigh={fmtUsd(yearHigh)}
          />
        </div>
      )}

      {isNum(quote?.dayLow) && isNum(quote?.dayHigh) && isNum(price) && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-gray-500">DAY RANGE</span>
          </div>
          <RangeBar
            low={quote?.dayLow}
            high={quote?.dayHigh}
            value={price}
            labelLow={fmtUsd(quote?.dayLow)}
            labelHigh={fmtUsd(quote?.dayHigh)}
          />
        </div>
      )}

      {groups.map((g) => {
        const rows = g.rows.filter((r) => r.ok);
        if (rows.length === 0) return null;
        return (
          <div key={g.header}>
            <GroupHeader>{g.header}</GroupHeader>
            {rows.map((r) => (
              <StatRow key={r.key} label={r.label} value={r.value} sub={r.sub} />
            ))}
          </div>
        );
      })}

      {nextEarnings && (
        <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/[0.06] px-3 py-2.5 flex items-center justify-between">
          <span className="text-xs text-gray-400">Next Earnings</span>
          <span className="font-mono text-sm tabular-nums text-yellow-300">
            {fmtDate(nextEarnings.date)}
          </span>
        </div>
      )}

      <Link
        href="/register"
        className="block text-center mt-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-400 text-black text-sm font-bold hover:scale-[1.02] transition-transform"
      >
        Unlock AI Research &rarr;
      </Link>
    </div>
  );
};

export default OverviewPanel;
