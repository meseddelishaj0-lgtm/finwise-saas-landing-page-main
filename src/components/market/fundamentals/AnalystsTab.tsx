"use client";

import React from "react";
import {
  useDataset,
  fmtMoney,
  fmtUsd,
  fmtNum,
  fmtSignedPct,
  fmtDateShort,
  signClass,
  SectionCard,
  Skeleton,
  EmptyNote,
  RangeBar,
} from "./shared";

/* ----------------------------- helpers ----------------------------- */

const isNum = (v: any): v is number => typeof v === "number" && isFinite(v);

const actionPillClass = (action?: string | null): string => {
  const a = (action ?? "").toLowerCase();
  if (a.includes("upgrade")) return "bg-green-400/10 text-green-400";
  if (a.includes("downgrade")) return "bg-red-400/10 text-red-400";
  if (a.includes("initia")) return "bg-yellow-400/10 text-yellow-300";
  return "bg-white/5 text-gray-400";
};

/** 5-notch score meter (filled = score, gold). */
const ScoreMeter: React.FC<{ score?: number | null }> = ({ score }) => {
  const s = isNum(score) ? Math.min(Math.max(Math.round(score), 0), 5) : 0;
  return (
    <div className="flex items-center gap-1" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 w-5 rounded-full ${
            i < s ? "bg-yellow-400" : "bg-white/10"
          }`}
        />
      ))}
    </div>
  );
};

/* ------------------------------ cards ------------------------------ */

const PriceTargetCard: React.FC<{ symbol: string; quote?: any }> = ({
  symbol,
  quote,
}) => {
  const consensus = useDataset<any>(symbol, "price-target-consensus");
  const targets = useDataset<any[]>(symbol, "price-targets");

  const loading = consensus.loading || targets.loading;
  const c = consensus.data;
  const list = Array.isArray(targets.data) ? targets.data : [];

  const currentPrice: number | undefined = isNum(quote?.price)
    ? quote.price
    : isNum(list[0]?.priceWhenPosted)
    ? list[0].priceWhenPosted
    : undefined;

  const upside =
    isNum(c?.targetConsensus) && isNum(currentPrice) && currentPrice !== 0
      ? c.targetConsensus / currentPrice - 1
      : null;

  return (
    <SectionCard title="Price Target" subtitle="Wall Street consensus">
      {loading ? (
        <Skeleton rows={8} />
      ) : !c && list.length === 0 ? (
        <EmptyNote />
      ) : (
        <div className="p-4 md:p-5 space-y-5">
          {c ? (
            <div>
              <div className="font-mono tabular-nums text-3xl font-bold text-yellow-300">
                {fmtUsd(c.targetConsensus)}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Median{" "}
                {isNum(c.targetMedian) ? fmtUsd(c.targetMedian) : "N/A"}
              </p>
            </div>
          ) : (
            <EmptyNote text="No consensus target available." />
          )}

          {c && (
            <RangeBar
              low={c.targetLow}
              high={c.targetHigh}
              value={currentPrice}
              labelLow={`Low ${fmtUsd(c.targetLow)}`}
              labelHigh={`High ${fmtUsd(c.targetHigh)}`}
            />
          )}

          {upside !== null && (
            <p className="text-xs text-gray-500">
              <span
                className={`font-mono tabular-nums font-bold ${signClass(
                  upside
                )}`}
              >
                {fmtSignedPct(upside)}
              </span>{" "}
              vs current price
            </p>
          )}

          {list.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-gray-500 font-medium mb-1">
                Latest Price Targets
              </p>
              <div>
                {list.slice(0, 6).map((t, i) => {
                  const row = (
                    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                      <div className="min-w-0">
                        <span className="text-xs text-gray-100">
                          {t?.analystName || "—"}
                        </span>
                        <span className="block text-[11px] text-gray-500 truncate">
                          {t?.analystCompany || ""}
                          {t?.publishedDate
                            ? ` · ${fmtDateShort(t.publishedDate)}`
                            : ""}
                        </span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="block font-mono text-sm tabular-nums text-gray-100">
                          {fmtUsd(t?.priceTarget)}
                        </span>
                        <span className="block text-[10px] font-mono tabular-nums text-gray-600">
                          was {fmtUsd(t?.priceWhenPosted)}
                        </span>
                      </div>
                    </div>
                  );
                  return t?.newsURL ? (
                    <a
                      key={i}
                      href={t.newsURL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      {row}
                    </a>
                  ) : (
                    <div key={i}>{row}</div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
};

const RatingCard: React.FC<{ symbol: string }> = ({ symbol }) => {
  const { data, loading } = useDataset<any>(symbol, "rating");
  const r = data;

  const meters: { label: string; score?: number; rec?: string }[] = r
    ? [
        {
          label: "DCF",
          score: r.ratingDetailsDCFScore,
          rec: r.ratingDetailsDCFRecommendation,
        },
        {
          label: "ROE",
          score: r.ratingDetailsROEScore,
          rec: r.ratingDetailsROERecommendation,
        },
        {
          label: "ROA",
          score: r.ratingDetailsROAScore,
          rec: r.ratingDetailsROARecommendation,
        },
        {
          label: "D/E",
          score: r.ratingDetailsDEScore,
          rec: r.ratingDetailsDERecommendation,
        },
        {
          label: "P/E",
          score: r.ratingDetailsPEScore,
          rec: r.ratingDetailsPERecommendation,
        },
        {
          label: "P/B",
          score: r.ratingDetailsPBScore,
          rec: r.ratingDetailsPBRecommendation,
        },
      ]
    : [];

  return (
    <SectionCard title="Wall Street Rating" subtitle="Composite score">
      {loading ? (
        <Skeleton rows={8} />
      ) : !r ? (
        <EmptyNote />
      ) : (
        <div className="p-4 md:p-5">
          <div className="flex items-center gap-4 mb-5">
            <span className="font-mono text-4xl font-bold text-yellow-300">
              {r.rating || "—"}
            </span>
            <div className="min-w-0">
              {r.ratingRecommendation && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-yellow-400/10 text-yellow-300 border border-yellow-400/20">
                  {r.ratingRecommendation}
                </span>
              )}
              <span className="block text-[11px] font-mono tabular-nums text-gray-500 mt-1">
                Score {isNum(r.ratingScore) ? r.ratingScore : "—"}/5
              </span>
            </div>
          </div>
          <div className="space-y-3">
            {meters.map((m) => (
              <div
                key={m.label}
                className="flex items-center justify-between gap-3"
              >
                <span className="text-xs text-gray-500 w-9 flex-shrink-0">
                  {m.label}
                </span>
                <ScoreMeter score={m.score} />
                <span className="text-[11px] text-gray-500 text-right flex-1 truncate">
                  {m.rec || "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  );
};

const EstimatesCard: React.FC<{ symbol: string }> = ({ symbol }) => {
  const { data, loading } = useDataset<any[]>(symbol, "estimates");

  const now = new Date().getTime();
  const future = (Array.isArray(data) ? data : [])
    .filter((e) => {
      const t = new Date(String(e?.date ?? "").replace(" ", "T")).getTime();
      return isFinite(t) && t >= now;
    })
    .sort(
      (a, b) =>
        new Date(String(a?.date).replace(" ", "T")).getTime() -
        new Date(String(b?.date).replace(" ", "T")).getTime()
    )
    .slice(0, 4);

  const rows: {
    label: string;
    render: (e: any) => React.ReactNode;
  }[] = [
    {
      label: "Revenue",
      render: (e) => (
        <>
          <span className="block">{fmtMoney(e?.estimatedRevenueAvg)}</span>
          <span className="block text-[10px] text-gray-600">
            {fmtMoney(e?.estimatedRevenueLow)}–{fmtMoney(e?.estimatedRevenueHigh)}
          </span>
        </>
      ),
    },
    {
      label: "EPS",
      render: (e) => (
        <>
          <span className="block">{fmtNum(e?.estimatedEpsAvg)}</span>
          <span className="block text-[10px] text-gray-600">
            {fmtNum(e?.estimatedEpsLow)}–{fmtNum(e?.estimatedEpsHigh)}
          </span>
        </>
      ),
    },
    { label: "EBITDA", render: (e) => fmtMoney(e?.estimatedEbitdaAvg) },
    { label: "Net Income", render: (e) => fmtMoney(e?.estimatedNetIncomeAvg) },
    {
      label: "Analysts",
      render: (e) =>
        isNum(e?.numberAnalystsEstimatedEps) ? e.numberAnalystsEstimatedEps : "—",
    },
  ];

  return (
    <SectionCard title="Analyst Estimates" subtitle="Forward fiscal years">
      {loading ? (
        <Skeleton rows={8} />
      ) : future.length === 0 ? (
        <EmptyNote text="No forward estimates available." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-[11px] uppercase tracking-wider text-gray-500 font-medium text-left py-2 px-3" />
                {future.map((e, i) => (
                  <th
                    key={i}
                    className="text-[11px] uppercase tracking-wider text-gray-500 font-medium text-right py-2 px-3 whitespace-nowrap"
                  >
                    FY {fmtDateShort(e?.date)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.label}
                  className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-2.5 px-3 whitespace-nowrap text-xs text-gray-500">
                    {row.label}
                  </td>
                  {future.map((e, i) => (
                    <td
                      key={i}
                      className="py-2.5 px-3 whitespace-nowrap text-right font-mono tabular-nums text-gray-100"
                    >
                      {row.render(e)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
};

const GradesCard: React.FC<{ symbol: string }> = ({ symbol }) => {
  const { data, loading } = useDataset<any[]>(symbol, "grades");
  const list = (Array.isArray(data) ? data : []).slice(0, 10);

  return (
    <SectionCard title="Recent Analyst Actions" subtitle="Upgrades & downgrades">
      {loading ? (
        <Skeleton rows={8} />
      ) : list.length === 0 ? (
        <EmptyNote />
      ) : (
        <div className="p-2">
          {list.map((g, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 py-2.5 px-2 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
            >
              <div className="min-w-0 flex-shrink-0">
                <span className="block text-[11px] font-mono text-gray-500">
                  {fmtDateShort(g?.publishedDate)}
                </span>
                <span className="block text-xs font-medium text-gray-100 truncate">
                  {g?.gradingCompany || "—"}
                </span>
              </div>
              <div className="min-w-0 text-xs text-gray-100 truncate text-center flex-1">
                {g?.previousGrade ? (
                  <>
                    {g.previousGrade}
                    <span className="text-gray-600"> → </span>
                    {g?.newGrade || "—"}
                  </>
                ) : (
                  g?.newGrade || "—"
                )}
              </div>
              <span
                className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold capitalize ${actionPillClass(
                  g?.action
                )}`}
              >
                {g?.action || "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
};

/* ------------------------------- main ------------------------------ */

const AnalystsTab: React.FC<{ symbol: string; quote?: any }> = ({
  symbol,
  quote,
}) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <PriceTargetCard symbol={symbol} quote={quote} />
    <RatingCard symbol={symbol} />
    <EstimatesCard symbol={symbol} />
    <GradesCard symbol={symbol} />
  </div>
);

export default AnalystsTab;
