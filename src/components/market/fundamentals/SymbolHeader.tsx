"use client";

// Company identity strip that sits directly above the chart grid on /terminal.
// Logo + name + sector/industry chips, live price, and quick stats (cap, P/E,
// volume, 52-week range).

import React, { useState } from "react";
import { fmtCount, fmtNum, fmtUsd, RangeBar } from "./shared";
import { fmtCap } from "@/components/market/useQuotes";

const isNum = (v: any): v is number => typeof v === "number" && isFinite(v);

/** Mini stat stack: tiny uppercase label over a mono value. */
const Stat: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div>
    <div className="text-[10px] uppercase tracking-wider text-gray-600">
      {label}
    </div>
    <div className="font-mono text-sm tabular-nums text-gray-100 mt-0.5">
      {children}
    </div>
  </div>
);

const Chip: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <span
    className={`inline-block px-2 py-0.5 rounded-md bg-white/[0.05] text-[10px] text-gray-400 ${className}`}
  >
    {children}
  </span>
);

const SymbolHeader: React.FC<{
  symbol: string;
  quote?: any;
  profile?: any;
  loading?: boolean;
}> = ({ symbol, quote, profile, loading }) => {
  const [logoBroken, setLogoBroken] = useState(false);

  const displayName: string =
    profile?.companyName ?? quote?.name ?? symbol ?? "—";
  const cleanSymbol = String(symbol ?? "").replace(/\^/g, "");
  const initial = (displayName || cleanSymbol || "?").charAt(0).toUpperCase();
  const showLogo = Boolean(profile?.image) && !logoBroken;
  const nameLoading = Boolean(loading) && !profile;

  const price = quote?.price;
  const change = quote?.change;
  const changePct = quote?.changePercent;
  const up = isNum(change) ? change >= 0 : true;

  return (
    <div className="rounded-2xl border border-white/10 bg-surface px-4 md:px-5 py-3.5">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        {/* Identity */}
        <div className="flex items-center gap-3 min-w-0">
          {showLogo ? (
            <img
              src={profile.image}
              alt={`${displayName} logo`}
              className="w-11 h-11 rounded-xl border border-white/10 bg-white/5 object-contain p-1"
              onError={() => setLogoBroken(true)}
            />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-yellow-400/10 border border-yellow-400/25 grid place-items-center font-mono font-bold text-yellow-300 text-lg flex-shrink-0">
              {initial}
            </div>
          )}
          <div className="min-w-0">
            {nameLoading ? (
              <div className="h-5 w-40 bg-white/[0.06] animate-pulse rounded" />
            ) : (
              <div className="text-base md:text-lg font-bold text-gray-100 truncate max-w-[320px]">
                {displayName}
              </div>
            )}
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-gray-500 mt-0.5 min-w-0">
              <span className="flex-shrink-0">{cleanSymbol}</span>
              {profile?.exchangeShortName && (
                <>
                  <span className="text-gray-700 flex-shrink-0">·</span>
                  <span className="flex-shrink-0">
                    {profile.exchangeShortName}
                  </span>
                </>
              )}
              {profile?.sector && (
                <Chip className="flex-shrink-0">{profile.sector}</Chip>
              )}
              {profile?.industry && (
                <Chip className="truncate max-w-[180px]">
                  {profile.industry}
                </Chip>
              )}
            </div>
          </div>
        </div>

        {/* Price */}
        <div className="font-mono">
          {isNum(price) ? (
            <div className="text-2xl font-bold tabular-nums text-gray-100">
              {fmtUsd(price)}
            </div>
          ) : (
            <div className="w-24 h-7 bg-white/[0.06] animate-pulse rounded" />
          )}
          {isNum(change) && isNum(changePct) ? (
            <div
              className={`text-sm font-bold tabular-nums ${
                up ? "text-green-400" : "text-red-400"
              }`}
            >
              {up ? "▲" : "▼"} {up ? "+" : "-"}${Math.abs(change).toFixed(2)} (
              {up ? "+" : ""}
              {changePct.toFixed(2)}%)
            </div>
          ) : (
            <div className="text-sm font-bold text-gray-600">—</div>
          )}
        </div>

        {/* Quick stats */}
        <div className="hidden xl:flex items-center gap-6 ml-auto">
          <Stat label="Market Cap">{fmtCap(quote?.marketCap)}</Stat>
          <Stat label="P/E">{fmtNum(quote?.pe, 1)}</Stat>
          <Stat label="Volume">{fmtCount(quote?.volume)}</Stat>
          <div className="w-36">
            <div className="text-[10px] uppercase tracking-wider text-gray-600 mb-1.5">
              52W
            </div>
            <RangeBar
              low={quote?.yearLow}
              high={quote?.yearHigh}
              value={quote?.price}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SymbolHeader;
