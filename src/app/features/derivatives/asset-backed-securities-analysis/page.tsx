"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Search, Banknote, ArrowLeft, TrendingUp } from "lucide-react";

// MBS/ABS yields and prepayment data are not sold by our market-data
// provider. This page charts the listed ETFs that hold these securities
// instead (daily closes from /api/market/chart) and labels the series as a
// fund price, not a yield.

export default function AssetBackedSecuritiesAnalysisPage() {
  const [query, setQuery] = useState("MBB"); // default: iShares MBS ETF
  const [data, setData] = useState<any | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchABSData = async (symbol: string) => {
    try {
      setLoading(true);
      setError(null);

      const sym = symbol.toUpperCase();
      const res = await fetch(
        `/api/market/chart?symbol=${encodeURIComponent(sym)}&range=6M`
      );
      if (!res.ok) throw new Error("Request failed");
      const bars = await res.json();

      if (!Array.isArray(bars) || bars.length === 0) throw new Error("No data found");

      // Bars are ascending: { t, o, h, l, c, v }
      const last = bars[bars.length - 1];
      setData({ symbol: sym, price: last.c, date: String(last.t).slice(0, 10) });

      setChartData(
        bars.map((b: any) => ({ date: String(b.t).slice(0, 10), price: b.c }))
      );

      // AI commentary removed — needs a server route
    } catch (err: any) {
      console.error(err);
      setError("Could not retrieve data for that ETF.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchABSData(query);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() !== "") fetchABSData(query.trim());
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Back */}
      <Link
        href="/features"
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gold transition mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Features
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <Banknote className="w-6 h-6 text-gold" />
        <h1 className="text-3xl text-ivory font-display font-normal tracking-tight md:text-4xl">
          Asset-Backed Securities Analysis
        </h1>
      </div>
      <p className="text-gray-400 mb-8 text-lg">
        Track mortgage-backed and consumer ABS markets through the listed ETFs
        that hold them.
      </p>

      {/* Search */}
      <form
        onSubmit={handleSearch}
        className="flex items-center gap-2 mb-8 bg-surface shadow rounded-full border border-white/10 p-2"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search an MBS/ABS ETF (e.g. MBB, VMBS, SPMB)"
          className="flex-1 px-4 py-2 rounded-full outline-none text-gray-300"
        />
        <button
          type="submit"
          className="bg-yellow-400 hover:bg-gold text-black font-semibold px-4 py-2 rounded-full transition"
        >
          <Search className="w-4 h-4" />
        </button>
      </form>

      {loading && <p>Loading ABS data...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && !error && data && (
        <>
          {/* Chart */}
          <div className="bg-surface rounded-3xl shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gold" /> Price Trend — {data.symbol}
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Daily closes over six months, as of {data.date} (last $
              {data.price?.toFixed(2)}). MBS/ABS yields and prepayment data are
              not available from our market-data provider — this is the
              fund&apos;s price, not a yield.
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={["auto", "auto"]} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#FACC15"
                  fill="#FEF08A"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* AI commentary removed — needs a server route */}
        </>
      )}

      <div className="mt-10 text-xs text-gray-500 leading-relaxed">
        <strong>Disclaimer:</strong> Data and commentary are for educational
        purposes only and not investment advice.
      </div>
    </div>
  );
}
