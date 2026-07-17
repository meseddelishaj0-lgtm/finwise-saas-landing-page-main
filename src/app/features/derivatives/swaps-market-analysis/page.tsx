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
import { Search, ArrowLeft, TrendingUp, LineChart as ChartIcon } from "lucide-react";

export default function SwapsMarketAnalysisPage() {
  const [query, setQuery] = useState("USDIRS"); // Default: USD Interest Rate Swap
  const [data, setData] = useState<any | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Fetch Swaps Data (using FMP Ultimate)
  const fetchSwapsData = async (symbol: string) => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        `/api/proxy/fmp/api/v4/treasury?symbol=${symbol}`
      );

      if (!res.ok) throw new Error("Request failed");
      const json = await res.json();

      if (!json || json.length === 0) throw new Error("No data found");

      // sample: { date, rate }
      const latest = json[0];
      setData(latest);

      const formatted = json
        .slice(0, 10)
        .reverse()
        .map((d: any) => ({
          date: d.date,
          rate: d.rate,
        }));

      setChartData(formatted);
      // AI commentary removed — needs a server route
    } catch (err: any) {
      console.error(err);
      setError("Unable to fetch swaps data for that symbol.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() !== "") fetchSwapsData(query.trim());
  };

  // Default load
  useEffect(() => {
    fetchSwapsData(query);
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* 🔙 Back Button */}
      <div className="mb-6">
        <Link
          href="/features"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-yellow-600 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Features
        </Link>
      </div>

      {/* 🧠 Title */}
      <div className="flex items-center gap-3 mb-2">
        <ChartIcon className="w-6 h-6 text-yellow-500" />
        <h1 className="text-3xl font-bold text-gray-900">Swaps Market Analysis</h1>
      </div>
      <p className="text-gray-600 mb-8 text-lg">
        Explore live swap rate data and yield spreads across global markets.
        Analyze trends, visualize historical movements, and get AI-powered insights.
      </p>

      {/* 🔍 Search */}
      <form
        onSubmit={handleSearch}
        className="flex items-center gap-2 mb-8 bg-white shadow rounded-full border border-gray-200 p-2"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search swap symbol (e.g. USDIRS, EURIRS, JPYIRS)"
          className="flex-1 px-4 py-2 rounded-full outline-none text-gray-700"
        />
        <button
          type="submit"
          className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-4 py-2 rounded-full transition"
        >
          <Search className="w-4 h-4" />
        </button>
      </form>

      {loading && <p>Loading live swap data...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && !error && data && (
        <>
          {/* 💹 Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white shadow rounded-2xl p-5 text-center">
              <p className="text-sm text-gray-500">Symbol</p>
              <p className="text-xl font-semibold text-gray-800">{query}</p>
            </div>
            <div className="bg-white shadow rounded-2xl p-5 text-center">
              <p className="text-sm text-gray-500">Latest Rate</p>
              <p className="text-2xl font-bold text-yellow-600">
                {data.rate?.toFixed(2)}%
              </p>
            </div>
            <div className="bg-white shadow rounded-2xl p-5 text-center">
              <p className="text-sm text-gray-500">Date</p>
              <p className="text-lg font-semibold text-gray-800">{data.date}</p>
            </div>
            <div className="bg-white shadow rounded-2xl p-5 text-center">
              <p className="text-sm text-gray-500">Data Source</p>
              <p className="text-gray-700 font-medium">FMP Ultimate</p>
            </div>
          </div>

          {/* 📈 Chart */}
          <div className="bg-white rounded-3xl shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-yellow-500" /> Rate Trends
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="rate"
                  stroke="#FACC15"
                  fill="#FEF08A"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* AI commentary removed — needs a server route */}
        </>
      )}

      {/* 🧠 Disclaimer */}
      <div className="mt-10 text-xs text-gray-500 leading-relaxed">
        <p>
          <strong>Disclaimer:</strong> WallStreetStocks.ai is a financial
          research and analytics platform powered by artificial intelligence and
          real-time market data. The information and insights provided are for
          educational purposes only and do not constitute investment advice.
          Past performance is not indicative of future results.
        </p>
      </div>
    </div>
  );
}
