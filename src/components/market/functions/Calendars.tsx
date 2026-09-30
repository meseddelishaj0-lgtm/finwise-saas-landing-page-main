"use client";

import React, { useMemo, useState } from "react";
import { FnPanel, Pills, Loading, Empty, useJson, th, td, fmtBig, isNum } from "./ui";

// ECO (economic releases), EVTS (earnings), IPO calendars.

const dayLabel = (d: Date) => d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

/* -------------------------------- ECO -------------------------------- */

interface EcoRow {
  date: string;
  country: string;
  event: string;
  currency?: string;
  previous: number | null;
  estimate: number | null;
  actual: number | null;
  impact: string;
  unit?: string | null;
}

const COUNTRIES = [
  { key: "US", label: "US" },
  { key: "EU", label: "EU" },
  { key: "GB", label: "UK" },
  { key: "JP", label: "JP" },
  { key: "CN", label: "CN" },
  { key: "ALL", label: "All" },
];
const IMPACTS = [
  { key: "High", label: "High" },
  { key: "Medium", label: "Med+" },
  { key: "ALL", label: "All" },
];

const impactDot = (i: string) =>
  i === "High" ? "bg-red-400" : i === "Medium" ? "bg-yellow-400" : "bg-gray-600";

const fmtEco = (v: number | null, unit?: string | null) =>
  isNum(v) ? `${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}${unit ?? ""}` : "—";

export const EcoCalendar: React.FC = () => {
  const [country, setCountry] = useState("US");
  const [impact, setImpact] = useState("Medium");
  const { data, loading } = useJson<{ data: EcoRow[] }>("/api/calendars", 0, { type: "economy" });

  const groups = useMemo(() => {
    const rows = (data?.data ?? []).filter((r) => {
      if (country !== "ALL" && r.country !== country) return false;
      if (impact === "High" && r.impact !== "High") return false;
      if (impact === "Medium" && r.impact !== "High" && r.impact !== "Medium") return false;
      return true;
    });
    const out = new Map<string, { when: Date; row: EcoRow }[]>();
    for (const r of rows) {
      // FMP economic calendar timestamps are UTC.
      const when = new Date(`${r.date.replace(" ", "T")}Z`);
      const k = when.toDateString();
      if (!out.has(k)) out.set(k, []);
      out.get(k)!.push({ when, row: r });
    }
    return Array.from(out.values()).slice(0, 21);
  }, [data, country, impact]);

  return (
    <FnPanel
      code="ECO"
      title="Economic Calendar"
      subtitle="Macro releases · next 30 days · times in your timezone"
      right={
        <>
          <Pills options={COUNTRIES} value={country} onChange={setCountry} />
          <Pills options={IMPACTS} value={impact} onChange={setImpact} />
        </>
      }
    >
      {loading ? (
        <Loading rows={12} />
      ) : !groups.length ? (
        <Empty text="No releases match these filters." />
      ) : (
        <div className="max-h-[620px] overflow-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-surface z-10">
              <tr className="border-b border-white/10">
                <th className={th}>Time</th>
                <th className={th}>Ctry</th>
                <th className={th}>Event</th>
                <th className={`${th} text-right`}>Actual</th>
                <th className={`${th} text-right`}>Survey</th>
                <th className={`${th} text-right`}>Prior</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <React.Fragment key={g[0].when.toDateString()}>
                  <tr>
                    <td colSpan={6} className="px-3 pt-4 pb-1.5 text-[11px] font-black uppercase tracking-widest text-yellow-300">
                      {dayLabel(g[0].when)}
                    </td>
                  </tr>
                  {g.map(({ when, row }, i) => {
                    const beat = isNum(row.actual) && isNum(row.estimate) ? row.actual - row.estimate : null;
                    return (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/[0.03]">
                        <td className={`${td} text-gray-400`}>{when.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</td>
                        <td className={`${td} text-gray-400`}>{row.country}</td>
                        <td className="px-3 py-2 text-xs text-gray-100">
                          <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle ${impactDot(row.impact)}`} />
                          {row.event}
                        </td>
                        <td className={`${td} text-right font-bold ${beat == null ? "text-gray-100" : beat > 0 ? "text-green-400" : beat < 0 ? "text-red-400" : "text-gray-100"}`}>
                          {fmtEco(row.actual, row.unit)}
                        </td>
                        <td className={`${td} text-right text-gray-300`}>{fmtEco(row.estimate, row.unit)}</td>
                        <td className={`${td} text-right text-gray-500`}>{fmtEco(row.previous, row.unit)}</td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </FnPanel>
  );
};

/* -------------------------------- EVTS -------------------------------- */

interface ErnRow {
  date: string;
  symbol: string;
  time: string | null;
  epsEstimated: number | null;
  eps: number | null;
  revenueEstimated: number | null;
  revenue: number | null;
}

export const EarningsCalendar: React.FC<{ onSelect: (s: string) => void }> = ({ onSelect }) => {
  const { data, loading } = useJson<ErnRow[]>("/api/market/global?view=earnings");
  const [day, setDay] = useState<string | null>(null);

  const days = useMemo(() => Array.from(new Set((data ?? []).map((r) => r.date))).slice(0, 10), [data]);
  const active = day && days.includes(day) ? day : days[0];
  const rows = (data ?? []).filter((r) => r.date === active);

  return (
    <FnPanel
      code="EVTS"
      title="Earnings Calendar"
      subtitle="US reporters with $100M+ revenue estimates · next 2 weeks"
      right={
        days.length ? (
          <Pills
            options={days.map((d) => ({ key: d, label: new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric" }) }))}
            value={active}
            onChange={setDay}
          />
        ) : null
      }
    >
      {loading ? (
        <Loading rows={10} />
      ) : !rows.length ? (
        <Empty text="No scheduled earnings found." />
      ) : (
        <div className="max-h-[560px] overflow-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-surface z-10">
              <tr className="border-b border-white/10">
                <th className={th}>Ticker</th>
                <th className={th}>Time</th>
                <th className={`${th} text-right`}>EPS est.</th>
                <th className={`${th} text-right`}>EPS act.</th>
                <th className={`${th} text-right`}>Rev est.</th>
                <th className={`${th} text-right`}>Rev act.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const beat = isNum(r.eps) && isNum(r.epsEstimated) ? r.eps - r.epsEstimated : null;
                return (
                  <tr key={r.symbol} onClick={() => onSelect(r.symbol)} className="border-b border-white/5 cursor-pointer hover:bg-white/[0.04]">
                    <td className={`${td} font-bold text-gray-100`}>{r.symbol}</td>
                    <td className={`${td} text-gray-400`}>{r.time === "bmo" ? "☀ Pre-mkt" : r.time === "amc" ? "☾ After close" : "—"}</td>
                    <td className={`${td} text-right text-gray-300`}>{isNum(r.epsEstimated) ? r.epsEstimated.toFixed(2) : "—"}</td>
                    <td className={`${td} text-right font-bold ${beat == null ? "text-gray-500" : beat >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {isNum(r.eps) ? r.eps.toFixed(2) : "—"}
                    </td>
                    <td className={`${td} text-right text-gray-300`}>{fmtBig(r.revenueEstimated)}</td>
                    <td className={`${td} text-right text-gray-400`}>{fmtBig(r.revenue)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </FnPanel>
  );
};

/* -------------------------------- IPO -------------------------------- */

interface IpoRow {
  symbol: string;
  name: string;
  date: string;
  price: string;
  shares?: number | null;
  exchange: string;
  status: "upcoming" | "priced";
}

export const IpoCalendar: React.FC<{ onSelect: (s: string) => void }> = ({ onSelect }) => {
  const [status, setStatus] = useState("upcoming");
  const { data, loading } = useJson<IpoRow[]>("/api/ipo");
  const rows = (Array.isArray(data) ? data : [])
    .filter((r) => r.status === status)
    .sort((a, b) => (status === "upcoming" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)));

  return (
    <FnPanel
      code="IPO"
      title="IPO Calendar"
      right={<Pills options={[{ key: "upcoming", label: "Upcoming" }, { key: "priced", label: "Priced" }]} value={status} onChange={setStatus} />}
    >
      {loading ? (
        <Loading rows={10} />
      ) : !rows.length ? (
        <Empty text={`No ${status} IPOs.`} />
      ) : (
        <div className="max-h-[560px] overflow-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-surface z-10">
              <tr className="border-b border-white/10">
                <th className={th}>Date</th>
                <th className={th}>Company</th>
                <th className={th}>Exchange</th>
                <th className={`${th} text-right`}>Price</th>
                <th className={`${th} text-right`}>Shares</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={`${r.symbol}-${i}`}
                  onClick={() => status === "priced" && r.symbol !== "N/A" && onSelect(r.symbol)}
                  className={`border-b border-white/5 ${status === "priced" ? "cursor-pointer hover:bg-white/[0.04]" : ""}`}
                >
                  <td className={`${td} text-gray-400`}>{r.date !== "N/A" ? new Date(`${r.date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—"}</td>
                  <td className="px-3 py-2 text-xs">
                    <span className="font-mono font-bold text-gray-100">{r.symbol}</span>
                    <span className="ml-2 text-gray-400">{r.name}</span>
                  </td>
                  <td className={`${td} text-gray-500`}>{r.exchange}</td>
                  <td className={`${td} text-right text-gray-100`}>{r.price}</td>
                  <td className={`${td} text-right text-gray-400`}>{fmtBig(r.shares ?? null)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </FnPanel>
  );
};
