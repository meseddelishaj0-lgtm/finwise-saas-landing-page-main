"use client";

// Company Profile tab — about, peers, segments, executives, ESG, DCF, filings.

import React, { useState } from "react";
import Link from "next/link";
import {
  useDataset,
  fmtMoney,
  fmtCount,
  fmtUsd,
  fmtNum,
  fmtDate,
  SectionCard,
  DeltaPill,
  Skeleton,
  EmptyNote,
  Sparkbars,
} from "./shared";

/* ------------------------------ helpers ------------------------------ */

const isNum = (v: any): v is number => typeof v === "number" && isFinite(v);

const MetaItem: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className="min-w-0">
    <div className="text-[11px] uppercase tracking-wider text-gray-600 mb-1">
      {label}
    </div>
    <div className="text-sm text-gray-100 truncate">{children}</div>
  </div>
);

/* ------------------------------ cards ------------------------------ */

const AboutCard: React.FC<{ symbol: string }> = ({ symbol }) => {
  const { data: profile, loading } = useDataset<any>(symbol, "profile");
  const { data: employees } = useDataset<any[]>(symbol, "employees");
  const [expanded, setExpanded] = useState(false);

  const name = profile?.companyName || symbol;
  const empSeries = Array.isArray(employees)
    ? [...employees]
        .filter((e) => isNum(e?.employeeCount))
        .reverse()
        .map((e) => e.employeeCount as number)
    : [];
  const empCount = profile?.fullTimeEmployees
    ? parseInt(String(profile.fullTimeEmployees), 10)
    : null;
  const website: string | undefined = profile?.website || undefined;
  const hq = [profile?.city, profile?.state].filter(Boolean).join(", ");
  const ids = [
    profile?.cik ? `CIK ${profile.cik}` : null,
    profile?.isin ? `ISIN ${profile.isin}` : null,
    profile?.cusip ? `CUSIP ${profile.cusip}` : null,
  ].filter(Boolean) as string[];

  return (
    <SectionCard title={`About ${name}`} className="lg:col-span-2">
      {loading ? (
        <Skeleton rows={8} />
      ) : !profile ? (
        <EmptyNote />
      ) : (
        <div className="p-4 md:p-5 space-y-5">
          {profile.description && (
            <div>
              <p
                className={`text-sm text-gray-400 leading-relaxed ${
                  expanded ? "" : "line-clamp-4"
                }`}
              >
                {profile.description}
              </p>
              <button
                onClick={() => setExpanded((e) => !e)}
                className="text-yellow-300 text-xs mt-1.5 hover:text-yellow-200 transition-colors"
              >
                {expanded ? "Show less" : "Show more"}
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
            <MetaItem label="CEO">{profile.ceo || "—"}</MetaItem>
            <MetaItem label="Sector">{profile.sector || "—"}</MetaItem>
            <MetaItem label="Industry">{profile.industry || "—"}</MetaItem>
            <MetaItem label="Employees">
              <span className="inline-flex items-center gap-2">
                <span className="font-mono tabular-nums">
                  {isNum(empCount) ? fmtCount(empCount) : "—"}
                </span>
                {empSeries.length > 1 && <Sparkbars values={empSeries} />}
              </span>
            </MetaItem>
            <MetaItem label="Headquarters">
              {hq
                ? `${hq}${profile.country ? `, ${profile.country}` : ""}`
                : profile.country || "—"}
            </MetaItem>
            <MetaItem label="IPO Date">
              <span className="font-mono tabular-nums">
                {fmtDate(profile.ipoDate)}
              </span>
            </MetaItem>
            <MetaItem label="Exchange">
              {profile.exchangeShortName || profile.exchange || "—"}
            </MetaItem>
            <MetaItem label="Website">
              {website ? (
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-yellow-300 transition-colors"
                >
                  {website.replace(/^https?:\/\//, "")}
                </a>
              ) : (
                "—"
              )}
            </MetaItem>
            <MetaItem label="Phone">
              <span className="font-mono tabular-nums">
                {profile.phone || "—"}
              </span>
            </MetaItem>
          </div>

          {ids.length > 0 && (
            <div className="pt-3 border-t border-white/5 font-mono text-[10px] text-gray-600">
              {ids.join(" · ")}
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
};

const PeersCard: React.FC<{ symbol: string }> = ({ symbol }) => {
  const { data, loading } = useDataset<string[]>(symbol, "peers");
  const peers = Array.isArray(data)
    ? data.filter((p) => typeof p === "string" && p)
    : [];
  return (
    <SectionCard title="Peers">
      {loading ? (
        <Skeleton rows={4} />
      ) : peers.length === 0 ? (
        <EmptyNote />
      ) : (
        <div className="p-4 md:p-5 flex flex-wrap gap-2">
          {peers.map((p) => (
            <Link
              key={p}
              href={`/terminal?symbol=${encodeURIComponent(p)}`}
              className="px-3 py-1.5 rounded-lg border border-white/10 font-mono text-xs text-gray-300 hover:border-yellow-400/40 hover:text-yellow-300 transition-colors"
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </SectionCard>
  );
};

const SegmentsCard: React.FC<{ symbol: string }> = ({ symbol }) => {
  const { data, loading } = useDataset<any[]>(symbol, "segmentation");
  const rows = Array.isArray(data) ? data : [];
  const latest = rows[0];
  const prior = rows[1];
  const segments: [string, number][] = latest?.segments
    ? Object.entries(latest.segments as Record<string, any>)
        .filter((e): e is [string, number] => isNum(e[1]))
        .sort((a, b) => b[1] - a[1])
    : [];
  const total = segments.reduce((s, [, v]) => s + v, 0);

  return (
    <SectionCard
      title="Revenue Segments"
      subtitle={latest?.date ? fmtDate(latest.date) : undefined}
    >
      {loading ? (
        <Skeleton rows={5} />
      ) : segments.length === 0 || total <= 0 ? (
        <EmptyNote />
      ) : (
        <div className="p-4 md:p-5 space-y-4">
          {segments.map(([seg, v]) => {
            const share = (v / total) * 100;
            const prev = prior?.segments?.[seg];
            const yoy = isNum(prev) && prev !== 0 ? v / prev - 1 : null;
            return (
              <div key={seg}>
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <span className="text-xs text-gray-300 truncate">{seg}</span>
                  <span className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-mono text-xs tabular-nums text-gray-100">
                      {fmtMoney(v)}
                    </span>
                    <span className="font-mono text-[11px] tabular-nums text-gray-500">
                      {share.toFixed(1)}%
                    </span>
                    {yoy !== null && <DeltaPill v={yoy} />}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-yellow-500/50 to-yellow-400"
                    style={{ width: `${share}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
};

const ExecutivesCard: React.FC<{ symbol: string }> = ({ symbol }) => {
  const { data, loading } = useDataset<any[]>(symbol, "executives");
  const execs = Array.isArray(data) ? data : [];
  return (
    <SectionCard title="Key Executives">
      {loading ? (
        <Skeleton rows={6} />
      ) : execs.length === 0 ? (
        <EmptyNote />
      ) : (
        <div className="p-4 md:p-5">
          {execs.map((e, i) => (
            <div
              key={`${e?.name ?? i}-${i}`}
              className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0"
            >
              <div className="min-w-0">
                <div className="text-sm text-gray-100 font-medium truncate">
                  {e?.name || "—"}
                </div>
                <div className="text-[11px] text-gray-500 truncate">
                  {e?.title || ""}
                </div>
              </div>
              <span className="font-mono text-xs tabular-nums text-gray-400 flex-shrink-0">
                {isNum(e?.pay) ? fmtMoney(e.pay) : "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
};

const EsgCard: React.FC<{ symbol: string }> = ({ symbol }) => {
  const { data, loading } = useDataset<any[]>(symbol, "esg");
  const latest = Array.isArray(data) ? data[0] : null;
  const meters: { label: string; value: any; gold?: boolean }[] = latest
    ? [
        { label: "Environmental", value: latest.environmentalScore },
        { label: "Social", value: latest.socialScore },
        { label: "Governance", value: latest.governanceScore },
        { label: "Total", value: latest.ESGScore, gold: true },
      ]
    : [];
  return (
    <SectionCard
      title="ESG Scores"
      subtitle={latest?.date ? fmtDate(latest.date) : undefined}
    >
      {loading ? (
        <Skeleton rows={4} />
      ) : !latest ? (
        <EmptyNote />
      ) : (
        <div className="p-4 md:p-5 space-y-4">
          {meters.map((m) => (
            <div key={m.label} className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-28 flex-shrink-0">
                {m.label}
              </span>
              <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-2 rounded-full ${
                    m.gold
                      ? "bg-gradient-to-r from-yellow-500/50 to-yellow-400"
                      : "bg-white/40"
                  }`}
                  style={{
                    width: `${
                      isNum(m.value)
                        ? Math.min(Math.max(m.value, 0), 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
              <span className="font-mono text-xs tabular-nums text-gray-100 w-10 text-right flex-shrink-0">
                {fmtNum(m.value, 1)}
              </span>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
};

const DcfCard: React.FC<{ symbol: string }> = ({ symbol }) => {
  const { data, loading } = useDataset<any>(symbol, "dcf");
  const dcf = data?.dcf;
  const price = data?.stockPrice;
  const diff =
    isNum(dcf) && isNum(price) && dcf !== 0 ? price / dcf - 1 : null;
  return (
    <SectionCard title="DCF Valuation">
      {loading ? (
        <Skeleton rows={4} />
      ) : !isNum(dcf) ? (
        <EmptyNote />
      ) : (
        <div className="p-4 md:p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-gray-600 mb-1">
                DCF Fair Value
              </div>
              <div className="font-mono text-lg tabular-nums text-gray-100">
                {fmtUsd(dcf)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wider text-gray-600 mb-1">
                Price
              </div>
              <div className="font-mono text-lg tabular-nums text-gray-100">
                {fmtUsd(price)}
              </div>
            </div>
          </div>
          {diff !== null && (
            <p
              className={`text-sm font-medium ${
                diff > 0 ? "text-red-400" : "text-green-400"
              }`}
            >
              Trades{" "}
              <span className="font-mono tabular-nums">
                {Math.abs(diff * 100).toFixed(1)}%
              </span>{" "}
              {diff > 0 ? "above" : "below"} DCF value
            </p>
          )}
          <p className="text-[11px] text-gray-600">
            FMP discounted cash flow model
          </p>
        </div>
      )}
    </SectionCard>
  );
};

const FilingsCard: React.FC<{ symbol: string }> = ({ symbol }) => {
  const { data, loading } = useDataset<any[]>(symbol, "sec-filings");
  const filings = (Array.isArray(data) ? data : []).slice(0, 10);
  return (
    <SectionCard title="Recent SEC Filings">
      {loading ? (
        <Skeleton rows={8} />
      ) : filings.length === 0 ? (
        <EmptyNote />
      ) : (
        <div className="p-4 md:p-5">
          {filings.map((f, i) => {
            const href = f?.finalLink || f?.link;
            return (
              <div
                key={i}
                className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/[0.06] text-gray-300 flex-shrink-0">
                    {f?.type || "—"}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-gray-500 truncate">
                    {fmtDate(f?.fillingDate)}
                  </span>
                </div>
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-400 hover:text-yellow-300 transition-colors flex-shrink-0"
                  >
                    View →
                  </a>
                ) : (
                  <span className="text-xs text-gray-600 flex-shrink-0">—</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
};

/* ------------------------------ main ------------------------------ */

const ProfileTab: React.FC<{ symbol: string; quote?: any }> = ({ symbol }) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
    <AboutCard symbol={symbol} />
    <PeersCard symbol={symbol} />
    <SegmentsCard symbol={symbol} />
    <ExecutivesCard symbol={symbol} />
    <EsgCard symbol={symbol} />
    <DcfCard symbol={symbol} />
    <FilingsCard symbol={symbol} />
  </div>
);

export default ProfileTab;
