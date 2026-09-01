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
  Activity,
} from "lucide-react";

export default function CreditDerivativesAnalysisPage() {
  const [query, setQuery] = useState("AAPL-CDS"); // default symbol
  const [data, setData] = useState<any | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch credit derivative data
  const fetchCreditData = async (symbol: string) => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        `/api/proxy/fmp/api/v4/creditRating?symbol=${symbol}`
      );

      if (!res.ok) throw new Error("Request failed");
      const json = await res.json();

      if (!json || json.length === 0) throw new Error("No data found");

      const latest = json[0];
      setData(latest);

      // Generate fake spread data (you can connect CDS spread endpoint if you have it)
      const mock = Array.from({ length: 7 }, (_, i) => ({
        day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i],
        spread: Math.max(
          60 + Math.random() * 30 - Math.random() * 20,
          30
        ),
      }));
      setChartData(mock);

      // AI commentary removed — needs a server route
    } catch (err: any) {
      console.error(err);
      setError("Unable to fetch credit derivative data for that symbol.");
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
        Analyze credit risk, CDS spreads, and ratings to monitor corporate and
        sovereign credit exposure with AI-powered insights.
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
          placeholder="Search CDS or company symbol (e.g. AAPL-CDS, JPM-CDS, GOVT-CDS)"
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
          {/* Credit Rating Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-surface shadow rounded-2xl p-5 text-center">
              <p className="text-sm text-gray-500">Symbol</p>
              <p className="text-xl font-semibold text-gray-100">{query}</p>
            </div>
            <div className="bg-surface shadow rounded-2xl p-5 text-center">
              <p className="text-sm text-gray-500">Rating</p>
              <p className="text-2xl font-bold text-gold">
                {data.rating}
              </p>
            </div>
            <div className="bg-surface shadow rounded-2xl p-5 text-center">
              <p className="text-sm text-gray-500">Score</p>
              <p className="text-2xl font-bold">{data.ratingScore}</p>
            </div>
            <div className="bg-surface shadow rounded-2xl p-5 text-center">
              <p className="text-sm text-gray-500">Date</p>
              <p className="text-lg font-semibold">{data.date}</p>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-surface rounded-3xl shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gold" /> CDS Spread Trend
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="spread"
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
