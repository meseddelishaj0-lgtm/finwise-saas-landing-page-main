"use client";

import React from "react";
import {
  useDataset,
  fmtMoney,
  fmtCount,
  fmtUsd,
  fmtPct,
  fmtDate,
  fmtDateShort,
  signClass,
  SectionCard,
  Skeleton,
  EmptyNote,
} from "./shared";

/* ------------------------------ helpers ------------------------------ */

const cleanOwner = (t?: string | null): string =>
  t ? String(t).replace(/^officer:\s*/i, "") : "";

const ExternalLinkIcon: React.FC = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const StatCell: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <div className="rounded-xl border border-white/10 bg-surface px-4 py-3">
    <div className="text-[11px] text-gray-500">{label}</div>
    <div className="font-mono tabular-nums text-sm text-gray-100 mt-1">
      {value}
    </div>
  </div>
);

/* ------------------------------ component ------------------------------ */

const OwnershipTab: React.FC<{ symbol: string; quote?: any }> = ({
  symbol,
  quote,
}) => {
  const float = useDataset<any>(symbol, "shares-float");
  const insider = useDataset<any[]>(symbol, "insider");
  const inst = useDataset<any[]>(symbol, "institutional");

  const insiderRows = insider.data ?? [];
  const buys = insiderRows.filter(
    (r) => r?.acquistionOrDisposition === "A"
  ).length;
  const sells = insiderRows.filter(
    (r) => r?.acquistionOrDisposition === "D"
  ).length;

  const instRows = inst.data ?? [];
  const maxShares = instRows.reduce(
    (m, r) => (typeof r?.shares === "number" && r.shares > m ? r.shares : m),
    0
  );

  return (
    <div className="space-y-4">
      {/* ---------------------------- stat strip ---------------------------- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCell
          label="Outstanding Shares"
          value={fmtCount(float.data?.outstandingShares)}
        />
        <StatCell label="Float" value={fmtCount(float.data?.floatShares)} />
        <StatCell
          label="Free Float"
          value={fmtPct(float.data?.freeFloat, true)}
        />
        <StatCell label="Market Cap" value={fmtMoney(quote?.marketCap)} />
      </div>

      {/* ------------------------- insider activity ------------------------- */}
      <SectionCard
        title="Insider Activity"
        subtitle="Latest Form 4 transactions"
        right={
          !insider.loading && insiderRows.length > 0 ? (
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold tabular-nums bg-green-400/10 text-green-400">
                {buys} buys
              </span>
              <span className="text-gray-600 text-[11px]">·</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold tabular-nums bg-red-400/10 text-red-400">
                {sells} sells
              </span>
            </div>
          ) : undefined
        }
      >
        {insider.loading ? (
          <Skeleton rows={8} />
        ) : insiderRows.length === 0 ? (
          <EmptyNote text="No insider transactions reported for this symbol." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-[11px] uppercase tracking-wider text-gray-500 font-medium text-left py-2 px-3">
                    Date
                  </th>
                  <th className="text-[11px] uppercase tracking-wider text-gray-500 font-medium text-left py-2 px-3">
                    Insider
                  </th>
                  <th className="text-[11px] uppercase tracking-wider text-gray-500 font-medium text-left py-2 px-3">
                    Type
                  </th>
                  <th className="text-[11px] uppercase tracking-wider text-gray-500 font-medium text-right py-2 px-3">
                    Shares
                  </th>
                  <th className="text-[11px] uppercase tracking-wider text-gray-500 font-medium text-right py-2 px-3">
                    Price
                  </th>
                  <th className="text-[11px] uppercase tracking-wider text-gray-500 font-medium text-right py-2 px-3">
                    Value
                  </th>
                  <th className="py-2 px-3" />
                </tr>
              </thead>
              <tbody>
                {insiderRows.map((r, i) => {
                  const isBuy = r?.acquistionOrDisposition === "A";
                  const shares =
                    typeof r?.securitiesTransacted === "number"
                      ? r.securitiesTransacted
                      : null;
                  const price =
                    typeof r?.price === "number" && r.price > 0
                      ? r.price
                      : null;
                  const value =
                    shares !== null && shares > 0 && price !== null
                      ? shares * price
                      : null;
                  return (
                    <tr
                      key={i}
                      className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono tabular-nums text-gray-400">
                        {fmtDate(r?.transactionDate)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="truncate max-w-[180px] text-gray-100">
                          {r?.reportingName ?? "—"}
                        </div>
                        {cleanOwner(r?.typeOfOwner) && (
                          <div className="truncate max-w-[180px] text-[10px] text-gray-600">
                            {cleanOwner(r?.typeOfOwner)}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          title={r?.transactionType ?? undefined}
                          className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-mono font-bold ${
                            isBuy
                              ? "bg-green-400/10 text-green-400"
                              : "bg-red-400/10 text-red-400"
                          }`}
                        >
                          {isBuy ? "Buy" : "Sell"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono tabular-nums text-gray-100">
                        {fmtCount(shares)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono tabular-nums text-gray-100">
                        {price !== null ? fmtUsd(price) : "—"}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono tabular-nums text-gray-100">
                        {value !== null ? fmtMoney(value) : "—"}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-right">
                        {r?.link ? (
                          <a
                            href={r.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex text-gray-400 hover:text-yellow-300 transition-colors"
                            aria-label="View SEC filing"
                          >
                            <ExternalLinkIcon />
                          </a>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* --------------------- institutional holders ---------------------- */}
      <SectionCard
        title="Top Institutional Holders"
        subtitle="13F filings — largest positions"
      >
        {inst.loading ? (
          <Skeleton rows={8} />
        ) : instRows.length === 0 ? (
          <EmptyNote text="No institutional ownership data for this symbol." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-[11px] uppercase tracking-wider text-gray-500 font-medium text-left py-2 px-3">
                    Holder
                  </th>
                  <th className="text-[11px] uppercase tracking-wider text-gray-500 font-medium text-right py-2 px-3">
                    Shares
                  </th>
                  <th className="text-[11px] uppercase tracking-wider text-gray-500 font-medium text-right py-2 px-3">
                    Change
                  </th>
                  <th className="text-[11px] uppercase tracking-wider text-gray-500 font-medium text-right py-2 px-3">
                    Reported
                  </th>
                  <th className="text-[11px] uppercase tracking-wider text-gray-500 font-medium text-left py-2 px-3">
                    Size
                  </th>
                </tr>
              </thead>
              <tbody>
                {instRows.map((r, i) => {
                  const shares =
                    typeof r?.shares === "number" ? r.shares : null;
                  const change =
                    typeof r?.change === "number" ? r.change : null;
                  const pct =
                    shares !== null && maxShares > 0
                      ? (shares / maxShares) * 100
                      : 0;
                  return (
                    <tr
                      key={i}
                      className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="truncate max-w-[240px] text-gray-100">
                          {r?.holder ?? "—"}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono tabular-nums text-gray-100">
                        {fmtCount(shares)}
                      </td>
                      <td
                        className={`py-2.5 px-3 whitespace-nowrap text-right font-mono tabular-nums ${signClass(
                          change
                        )}`}
                      >
                        {change !== null && change > 0 ? "+" : ""}
                        {fmtCount(change)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono tabular-nums text-gray-400">
                        {fmtDateShort(r?.dateReported)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="w-24 h-1.5 rounded bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded bg-yellow-400/80"
                            style={{ width: `${Math.max(pct, 1)}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default OwnershipTab;
