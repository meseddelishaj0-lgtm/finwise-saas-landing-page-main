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
import {
  Search,
  Shield,
  ArrowLeft,
  TrendingUp,
} from "lucide-react";

// CDS spreads and credit ratings are not sold by our market-data provider.
// This page charts listed credit ETFs instead (high yield, investment grade,
// emerging markets, leveraged loans), which move with the same credit risk
// premium: daily closes from /api/market/chart, labelled as fund prices.

export default function CreditDerivativesAnalysisPage() {
  const [query, setQuery] = useState("HYG"); // default: high-yield corporate bond ETF
  const [data, setData] = useState<any | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch daily closes for a credit ETF
  const fetchCreditData = async (symbol: string) => {
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
      const prev = bars.length > 1 ? bars[bars.length - 2] : null;
      setData({
        symbol: sym,
        price: last.c,
        date: String(last.t).slice(0, 10),
        changePercent: prev?.c ? ((last.c - prev.c) / prev.c) * 100 : null,
      });

      setChartData(
        bars.map((b: any) => ({ date: String(b.t).slice(0, 10), price: b.c }))
      );

      // AI commentary removed — needs a server route
    } catch (err: any) {
      console.error(err);
      setError("Unable to fetch data for that symbol.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreditData(query);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() !== "") fetchCreditData(query.trim());
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Back */}
      <div className="mb-6">
        <Link
          href="/features"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gold transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Features
        </Link>
      </div>

      {/* Title */}
      <div className="flex items-center gap-3 mb-2">
        <Shield className="w-6 h-6 text-gold" />
        <h1 className="text-3xl text-ivory font-display font-normal tracking-tight md:text-4xl">
          Credit Derivatives Analysis
        </h1>
      </div>
      <p className="text-gray-400 mb-8 text-lg">
        Monitor corporate and emerging-market credit risk through the listed
        credit ETFs that price it.
      </p>

      {/* Search Bar */}
      <form
        onSubmit={handleSearch}
        className="flex items-center gap-2 mb-8 bg-surface shadow rounded-full border border-white/10 p-2"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a credit ETF (e.g. HYG, JNK, LQD, EMB)"
          className="flex-1 px-4 py-2 rounded-full outline-none text-gray-300"
        />
        <button
          type="submit"
          className="bg-yellow-400 hover:bg-gold text-black font-semibold px-4 py-2 rounded-full transition"
        >
          <Search className="w-4 h-4" />
        </button>
      </form>

      {loading && <p>Loading credit data...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && !error && data && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-surface shadow rounded-2xl p-5 text-center">
              <p className="text-sm text-gray-500">Symbol</p>
              <p className="text-xl font-semibold text-gray-100">{data.symbol}</p>
            </div>
            <div className="bg-surface shadow rounded-2xl p-5 text-center">
              <p className="text-sm text-gray-500">Latest Close</p>
              <p className="text-2xl font-bold text-gold">
                ${data.price?.toFixed(2)}
              </p>
            </div>
            <div className="bg-surface shadow rounded-2xl p-5 text-center">
              <p className="text-sm text-gray-500">Day Change</p>
              <p
                className={`text-2xl font-bold ${
                  (data.changePercent ?? 0) < 0 ? "text-red-400" : "text-green-400"
                }`}
              >
                {data.changePercent === null
                  ? "—"
                  : `${data.changePercent > 0 ? "+" : ""}${data.changePercent.toFixed(2)}%`}
              </p>
            </div>
            <div className="bg-surface shadow rounded-2xl p-5 text-center">
              <p className="text-sm text-gray-500">As of</p>
              <p className="text-lg font-semibold">{data.date}</p>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-surface rounded-3xl shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gold" /> Price Trend (credit ETF proxy)
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Daily closes over six months. CDS spreads and credit ratings are
              not available from our market-data provider — credit ETFs move with
              the same risk premium, but this is the fund&apos;s price, not a
              spread.
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

      {/* Disclaimer */}
      <div className="mt-10 text-xs text-gray-500 leading-relaxed">
        <p>
          <strong>Disclaimer:</strong> WallStreetStocks.ai is a financial
          research and analytics platform powered by artificial intelligence and
          real-time market data. The information provided is for educational
          purposes only and does not constitute investment or legal advice.
        </p>
      </div>
    </div>
  );
}
