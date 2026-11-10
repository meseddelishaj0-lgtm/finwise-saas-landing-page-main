"use client";

// Market-wide desks fed by /api/market/desk: CRYP (crypto board), ECST (US
// economic statistics), INSD (insider + congressional trades), COT (CFTC
// positioning).

import React, { useMemo, useState } from "react";
import { FnPanel, Pills, Loading, Empty, useJson, th, td, fmtP, fmtChg, fmtPctS, fmtBig, tone, heat, isNum } from "./ui";

const shortDate = (s: string) => {
  const d = new Date(`${s.slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};
const monthYear = (s: string) => {
  const d = new Date(`${s.slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
};

/* ------------------------------- CRYP ------------------------------- */

interface Coin {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  marketCap: number | null;
  volume: number | null;
  yearLow: number | null;
  yearHigh: number | null;
  avg50: number | null;
  avg200: number | null;
}

export const CryptoBoard: React.FC<{ onSelect: (s: string) => void }> = ({ onSelect }) => {
  const { data, loading } = useJson<Coin[]>("/api/market/desk?view=crypto", 30_000);
  const rows = Array.isArray(data) ? data : [];
  const total = rows.reduce((s, r) => s + (r.marketCap ?? 0), 0);
  const btc = rows.find((r) => r.symbol === "BTCUSD");
  const up = rows.filter((r) => (r.changePercent ?? 0) > 0).length;

  return (
    <FnPanel code="CRYP" title="Crypto Markets" subtitle="Top coins by market cap · refreshes every 30s · click a row to chart">
      {loading && !rows.length ? (
        <Loading rows={12} />
      ) : !rows.length ? (
        <Empty text="Crypto data is unavailable right now." />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-px bg-white/5 border-b border-white/5">
            {[
              { k: "Tracked market cap", v: `$${fmtBig(total)}` },
              { k: "BTC share of tracked", v: btc?.marketCap && total ? `${((btc.marketCap / total) * 100).toFixed(1)}%` : "—" },
              { k: "Advancing", v: `${up} of ${rows.length}` },
            ].map((s) => (
              <div key={s.k} className="bg-surface px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{s.k}</p>
                <p className="mt-0.5 font-mono tabular-nums text-sm text-gray-100">{s.v}</p>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10">
                  <th className={th}>#</th>
                  <th className={th}>Coin</th>
                  <th className={`${th} text-right`}>Price</th>
                  <th className={`${th} text-right`}>24h</th>
                  <th className={`${th} text-right`}>Mkt cap</th>
                  <th className={`${th} text-right`}>Volume</th>
                  <th className={`${th} text-right`}>vs 50D</th>
                  <th className={`${th} text-right`}>vs 200D</th>
                  <th className={`${th} text-right`}>Off 52W high</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const v50 = isNum(r.price) && r.avg50 ? (r.price / r.avg50 - 1) * 100 : null;
                  const v200 = isNum(r.price) && r.avg200 ? (r.price / r.avg200 - 1) * 100 : null;
                  const off = isNum(r.price) && r.yearHigh ? (r.price / r.yearHigh - 1) * 100 : null;
                  return (
                    <tr key={r.symbol} onClick={() => onSelect(r.symbol)} className="border-b border-white/5 cursor-pointer hover:bg-white/[0.04]">
                      <td className={`${td} text-gray-600`}>{i + 1}</td>
                      <td className="px-3 py-2 text-xs whitespace-nowrap">
                        <span className="font-mono font-bold text-gray-100">{r.symbol.replace(/USD$/, "")}</span>
                        <span className="ml-2 text-gray-500">{r.name}</span>
                      </td>
                      <td className={`${td} text-right text-gray-100`}>{fmtP(r.price)}</td>
                      <td className={`${td} text-right ${tone(r.changePercent)}`} style={heat(r.changePercent, 6)}>{fmtPctS(r.changePercent)}</td>
                      <td className={`${td} text-right text-gray-300`}>{fmtBig(r.marketCap)}</td>
                      <td className={`${td} text-right text-gray-400`}>{fmtBig(r.volume)}</td>
                      <td className={`${td} text-right ${tone(v50)}`}>{fmtPctS(v50, 1)}</td>
                      <td className={`${td} text-right ${tone(v200)}`}>{fmtPctS(v200, 1)}</td>
                      <td className={`${td} text-right text-gray-400`}>{fmtPctS(off, 1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </FnPanel>
  );
};

/* ------------------------------- ECST ------------------------------- */

interface EconSeries {
  key: string;
  label: string;
  group: string;
  unit: string;
  date: string;
  value: number;
  previous: number;
  change: number;
  series: { d: string; v: number }[];
}

const EconChart: React.FC<{ s: EconSeries }> = ({ s }) => {
  const [hi, setHi] = useState<number | null>(null);
  const pts = s.series;
  const W = 900;
  const H = 260;
  const P = { l: 8, r: 54, t: 12, b: 22 };
  const min = Math.min(...pts.map((p) => p.v));
  const max = Math.max(...pts.map((p) => p.v));
  const pad = (max - min || 1) * 0.08;
  const y0 = min - pad;
  const y1 = max + pad;
  const x = (i: number) => P.l + (i / (pts.length - 1)) * (W - P.l - P.r);
  const y = (v: number) => P.t + (1 - (v - y0) / (y1 - y0)) * (H - P.t - P.b);
  const path = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join("");
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => y0 + f * (y1 - y0));
  const cur = hi !== null ? pts[hi] : pts[pts.length - 1];
  const years = pts.reduce<number[]>((acc, p, i) => {
    if (i && p.d.slice(0, 4) !== pts[i - 1].d.slice(0, 4) && Number(p.d.slice(0, 4)) % 2 === 0) acc.push(i);
    return acc;
  }, []);

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 pt-4">
        <h4 className="text-sm font-bold text-gray-100">{s.label}</h4>
        <span className="font-mono tabular-nums text-lg text-yellow-300">{fmtP(cur.v, 2)}</span>
        <span className="text-[11px] text-gray-500">{s.unit} · {monthYear(cur.d)}</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-[240px] xl:h-[420px] mt-1 touch-none"
        preserveAspectRatio="none"
        role="img"
        aria-label={`${s.label} history`}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const f = ((e.clientX - r.left) / r.width) * W;
          setHi(Math.max(0, Math.min(pts.length - 1, Math.round(((f - P.l) / (W - P.l - P.r)) * (pts.length - 1)))));
        }}
        onPointerLeave={() => setHi(null)}
      >
        {ticks.map((t, i) => (
          <line key={i} x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,0.06)" vectorEffect="non-scaling-stroke" />
        ))}
        {y0 < 0 && y1 > 0 && <line x1={P.l} x2={W - P.r} y1={y(0)} y2={y(0)} stroke="rgba(255,255,255,0.28)" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />}
        <path d={`${path}L${x(pts.length - 1)},${H - P.b}L${P.l},${H - P.b}Z`} fill="rgba(250,204,21,0.07)" />
        <path d={path} fill="none" stroke="#FACC15" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
        {hi !== null && <line x1={x(hi)} x2={x(hi)} y1={P.t} y2={H - P.b} stroke="rgba(253,230,138,0.5)" vectorEffect="non-scaling-stroke" />}
      </svg>
      {/* Axis labels live outside the stretched SVG so text is not distorted */}
      <div className="flex justify-between px-4 pb-3 -mt-1 font-mono text-[10px] text-gray-600 tabular-nums">
        <span>{pts[0].d.slice(0, 4)}</span>
        {years.filter((_, i, a) => i % Math.ceil(a.length / 5) === 0).slice(1).map((i) => (
          <span key={i}>{pts[i].d.slice(0, 4)}</span>
        ))}
        <span>
          range {fmtP(min, 1)} – {fmtP(max, 1)}
        </span>
      </div>
    </div>
  );
};

export const EconStats: React.FC = () => {
  const { data, loading } = useJson<EconSeries[]>("/api/market/desk?view=econ");
  const rows = Array.isArray(data) ? data : [];
  const [key, setKey] = useState("CPI");
  const active = rows.find((r) => r.key === key) ?? rows[0];

  return (
    <FnPanel code="ECST" title="US Economic Statistics" subtitle="Latest reading, prior and long-run history · click an indicator to chart it">
      {loading && !rows.length ? (
        <Loading rows={10} />
      ) : !rows.length ? (
        <Empty text="Economic data is unavailable right now." />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,460px)_1fr]">
          <div className="xl:border-r border-white/5 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10">
                  <th className={th}>Indicator</th>
                  <th className={`${th} text-right`}>Latest</th>
                  <th className={`${th} text-right`}>Prior</th>
                  <th className={`${th} text-right`}>Chg</th>
                  <th className={`${th} text-right`}>As of</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.key}
                    onClick={() => setKey(r.key)}
                    className={`border-b border-white/5 cursor-pointer ${active?.key === r.key ? "bg-yellow-400/10" : "hover:bg-white/[0.04]"}`}
                  >
                    <td className="px-3 py-2 text-xs">
                      <span className="font-semibold text-gray-100">{r.label}</span>
                      <span className="block text-[10px] text-gray-600">{r.group} · {r.unit}</span>
                    </td>
                    <td className={`${td} text-right text-gray-100`}>{fmtP(r.value, 2)}</td>
                    <td className={`${td} text-right text-gray-500`}>{fmtP(r.previous, 2)}</td>
                    <td className={`${td} text-right text-gray-300`}>{fmtChg(r.change)}</td>
                    <td className={`${td} text-right text-gray-500`}>{monthYear(r.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>{active && <EconChart key={active.key} s={active} />}</div>
        </div>
      )}
    </FnPanel>
  );
};

/* ------------------------------- INSD ------------------------------- */

interface Insider {
  symbol: string;
  filed: string;
  date: string;
  name: string;
  role: string;
  side: "buy" | "sell";
  shares: number | null;
  price: number | null;
  value: number;
  link: string | null;
}
interface Congress {
  chamber: string;
  member: string;
  symbol: string;
  asset: string;
  type: string;
  amount: string;
  owner: string;
  date: string;
  disclosed: string;
  link: string | null;
}

export const InsiderFlow: React.FC<{ onSelect: (s: string) => void }> = ({ onSelect }) => {
  const [view, setView] = useState("Insiders");
  const [side, setSide] = useState("All");
  const [minVal, setMinVal] = useState("$100K+");
  const ins = useJson<Insider[]>("/api/market/desk?view=insiders", 120_000);
  const gov = useJson<Congress[]>(view === "Congress" ? "/api/market/desk?view=congress" : null);

  const floor = minVal === "Any" ? 0 : minVal === "$100K+" ? 1e5 : 1e6;
  const rows = useMemo(
    () =>
      (Array.isArray(ins.data) ? ins.data : []).filter(
        (r) => r.value >= floor && (side === "All" || (side === "Buys" ? r.side === "buy" : r.side === "sell"))
      ),
    [ins.data, floor, side]
  );
  const govRows = Array.isArray(gov.data) ? gov.data : [];
  const isBuy = (t: string) => /purchase|buy/i.test(t);

  return (
    <FnPanel
      code="INSD"
      title="Insider & Congressional Trades"
      subtitle={view === "Insiders" ? "Latest SEC Form 4 open-market buys and sells" : "Latest Senate and House periodic transaction reports"}
      right={
        <>
          <Pills options={["Insiders", "Congress"]} value={view} onChange={setView} />
          {view === "Insiders" && (
            <>
              <Pills options={["All", "Buys", "Sells"]} value={side} onChange={setSide} />
              <Pills options={["Any", "$100K+", "$1M+"]} value={minVal} onChange={setMinVal} />
            </>
          )}
        </>
      }
    >
      {view === "Insiders" ? (
        ins.loading && !ins.data ? (
          <Loading rows={12} />
        ) : !rows.length ? (
          <Empty text={ins.error ? "Insider filings are unavailable right now." : "No filings match these filters."} />
        ) : (
          <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-surface z-10">
                <tr className="border-b border-white/10">
                  <th className={th}>Filed</th>
                  <th className={th}>Ticker</th>
                  <th className={th}>Insider</th>
                  <th className={th}>Side</th>
                  <th className={`${th} text-right`}>Shares</th>
                  <th className={`${th} text-right`}>Price</th>
                  <th className={`${th} text-right`}>Value</th>
                  <th className={`${th} text-right`}>Form 4</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 150).map((r, i) => (
                  <tr key={`${r.symbol}-${r.filed}-${i}`} className="border-b border-white/5 hover:bg-white/[0.04]">
                    <td className={`${td} text-gray-500`}>{shortDate(r.filed)}</td>
                    <td className={td}>
                      <button onClick={() => onSelect(r.symbol)} className="font-bold text-yellow-300 hover:underline">{r.symbol}</button>
                    </td>
                    <td className="px-3 py-2 text-xs max-w-[260px]">
                      <span className="block text-gray-100 truncate">{r.name}</span>
                      <span className="block text-[10px] text-gray-600 truncate">{r.role}</span>
                    </td>
                    <td className={`${td} font-bold ${r.side === "buy" ? "text-green-400" : "text-red-400"}`}>{r.side === "buy" ? "BUY" : "SELL"}</td>
                    <td className={`${td} text-right text-gray-300`}>{fmtBig(r.shares)}</td>
                    <td className={`${td} text-right text-gray-300`}>{fmtP(r.price)}</td>
                    <td className={`${td} text-right text-gray-100`}>${fmtBig(r.value)}</td>
                    <td className={`${td} text-right`}>
                      {r.link ? (
                        <a href={r.link} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-yellow-300">SEC ↗</a>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : gov.loading && !gov.data ? (
        <Loading rows={12} />
      ) : !govRows.length ? (
        <Empty text="Congressional disclosures are unavailable right now." />
      ) : (
        <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-surface z-10">
              <tr className="border-b border-white/10">
                <th className={th}>Disclosed</th>
                <th className={th}>Member</th>
                <th className={th}>Ticker</th>
                <th className={th}>Type</th>
                <th className={th}>Amount</th>
                <th className={th}>Traded</th>
                <th className={`${th} text-right`}>Filing</th>
              </tr>
            </thead>
            <tbody>
              {govRows.map((r, i) => {
                const sym = /^[A-Z.]{1,6}$/.test(r.symbol) ? r.symbol : "";
                return (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/[0.04]">
                    <td className={`${td} text-gray-500`}>{shortDate(r.disclosed)}</td>
                    <td className="px-3 py-2 text-xs">
                      <span className="block text-gray-100">{r.member}</span>
                      <span className="block text-[10px] text-gray-600">{r.chamber}{r.owner ? ` · ${r.owner}` : ""}</span>
                    </td>
                    <td className="px-3 py-2 text-xs max-w-[240px]">
                      {sym ? (
                        <button onClick={() => onSelect(sym)} className="font-mono font-bold text-yellow-300 hover:underline">{sym}</button>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                      <span className="block text-[10px] text-gray-600 truncate">{r.asset}</span>
                    </td>
                    <td className={`${td} font-bold ${isBuy(r.type) ? "text-green-400" : /sale|sell/i.test(r.type) ? "text-red-400" : "text-gray-400"}`}>{r.type || "—"}</td>
                    <td className={`${td} text-gray-300`}>{r.amount || "—"}</td>
                    <td className={`${td} text-gray-500`}>{shortDate(r.date)}</td>
                    <td className={`${td} text-right`}>
                      {r.link ? (
                        <a href={r.link} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-yellow-300">View ↗</a>
                      ) : "—"}
                    </td>
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

/* -------------------------------- COT -------------------------------- */

interface CotRow {
  symbol: string;
  name: string;
  sector: string;
  date: string;
  longPct: number | null;
  shortPct: number | null;
  prevLongPct: number | null;
  situation: string;
  sentiment: string;
  net: number | null;
  prevNet: number | null;
  reversal: boolean;
}

export const CotBoard: React.FC = () => {
  const { data, loading } = useJson<CotRow[]>("/api/market/desk?view=cot");
  const rows = Array.isArray(data) ? data : [];
  const sectors = useMemo(() => ["All", ...Array.from(new Set(rows.map((r) => r.sector))).filter(Boolean)], [rows]);
  const [sector, setSector] = useState("All");
  const shown = rows.filter((r) => sector === "All" || r.sector === sector);
  const asOf = rows.reduce((m, r) => (r.date > m ? r.date : m), "");

  return (
    <FnPanel
      code="COT"
      title="Commitments of Traders"
      subtitle={`CFTC speculator positioning by contract${asOf ? ` · report of ${shortDate(asOf)}` : ""} · weekly`}
      right={sectors.length > 2 ? <Pills options={sectors} value={sector} onChange={setSector} /> : undefined}
    >
      {loading && !rows.length ? (
        <Loading rows={12} />
      ) : !rows.length ? (
        <Empty text="Positioning data is unavailable right now." />
      ) : (
        <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-surface z-10">
              <tr className="border-b border-white/10">
                <th className={th}>Contract</th>
                <th className={th}>Long / short</th>
                <th className={`${th} text-right`}>Long %</th>
                <th className={`${th} text-right`}>Chg w/w</th>
                <th className={`${th} text-right`}>Net position</th>
                <th className={`${th} text-right`}>Net chg</th>
                <th className={th}>Read</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const dLong = isNum(r.longPct) && isNum(r.prevLongPct) ? r.longPct - r.prevLongPct : null;
                const dNet = isNum(r.net) && isNum(r.prevNet) ? r.net - r.prevNet : null;
                return (
                  <tr key={r.symbol} className="border-b border-white/5 hover:bg-white/[0.04]">
                    <td className="px-3 py-2 text-xs whitespace-nowrap">
                      <span className="font-semibold text-gray-100">{r.name}</span>
                      <span className="block text-[10px] font-mono text-gray-600">{r.symbol} · {r.sector.toLowerCase()}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="flex w-36 h-1.5 rounded-full overflow-hidden bg-white/10">
                        <span className="bg-green-400/80" style={{ width: `${r.longPct ?? 0}%` }} />
                        <span className="bg-red-400/80" style={{ width: `${r.shortPct ?? 0}%` }} />
                      </span>
                    </td>
                    <td className={`${td} text-right text-gray-100`}>{isNum(r.longPct) ? `${r.longPct.toFixed(1)}%` : "—"}</td>
                    <td className={`${td} text-right ${tone(dLong)}`}>{fmtChg(dLong, 1)}</td>
                    <td className={`${td} text-right ${tone(r.net)}`}>{isNum(r.net) ? r.net.toLocaleString() : "—"}</td>
                    <td className={`${td} text-right ${tone(dNet)}`}>{isNum(dNet) ? `${dNet > 0 ? "+" : ""}${dNet.toLocaleString()}` : "—"}</td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap">
                      <span className={r.situation === "Bullish" ? "text-green-400" : r.situation === "Bearish" ? "text-red-400" : "text-gray-400"}>{r.situation || "—"}</span>
                      {r.reversal && <span className="ml-2 px-1.5 py-0.5 rounded bg-yellow-400/15 text-yellow-300 text-[10px] font-bold">REVERSAL</span>}
                    </td>
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
