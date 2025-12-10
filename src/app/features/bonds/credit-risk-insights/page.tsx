"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ArrowLeft, RefreshCcw } from "lucide-react";
import Link from "next/link";

const FMP_KEY = process.env.NEXT_PUBLIC_FMP_API_KEY!;

export default function CreditRiskInsights() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch live credit spread data
  const fetchCreditSpreads = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://financialmodelingprep.com/api/v4/spread?apikey=${FMP_KEY}`
      );
      const raw = await res.json();

      // Simulated mapping by region
      const regions = [
        { region: "US", spread: raw[0]?.spread ?? 1.1 },
        { region: "EU", spread: raw[1]?.spread ?? 1.4 },
        { region: "Asia", spread: raw[2]?.spread ?? 1.7 },
        { region: "LATAM", spread: raw[3]?.spread ?? 2.0 },
      ];
      setData(regions);
    } catch (err) {
      console.error("Error fetching spreads:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreditSpreads();
  }, []);

  return (
    <main className="min-h-screen bg-[#fffcee] text-[#111] px-6 md:px-14 py-28">
      {/* Back Button */}
      <div className="flex justify-start mb-6">
        <Link
          href="/features"
          className="flex items-center gap-2 bg-[#f9d949] hover:bg-[#f7c948] px-4 py-2 rounded-xl font-semibold transition"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Features
        </Link>
      </div>

      {/* Title */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold text-[#111]">
          Credit Risk Insights
        </h1>
        <p className="text-lg text-gray-600 mt-3">
          AI-based credit scoring blending ratings, spreads, and sentiment for forward risk.
        </p>
      </div>

      {/* Feature Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white border border-yellow-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-lg mb-2 text-[#111]">Issuer Trend</h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            Tracks credit quality movement for corporate and sovereign issuers
            using rating transitions and yield spreads.
          </p>
        </div>
        <div className="bg-white border border-yellow-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-lg mb-2 text-[#111]">Sector Model</h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            Identifies sector-level credit risks and default probabilities
            based on debt metrics and market sentiment.
          </p>
        </div>
        <div className="bg-white border border-yellow-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-lg mb-2 text-[#111]">Macro Stress</h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            Measures credit spread sensitivity to macroeconomic shocks like
            inflation, growth slowdown, or rate hikes.
          </p>
        </div>
      </div>

      {/* Chart Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-[#111]">
          Regional Credit Spread Risk
        </h2>
        <button
          onClick={fetchCreditSpreads}
          className="bg-[#f9d949] hover:bg-[#f7c948] px-4 py-2 rounded-xl flex items-center gap-2 font-semibold transition"
        >
          <RefreshCcw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Bar Chart */}
      <div className="bg-white border border-yellow-200 rounded-2xl p-6 shadow-md">
        {loading ? (
          <p className="text-center text-gray-500">Loading credit risk data...</p>
        ) : data.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f2eecb" />
              <XAxis dataKey="region" tick={{ fill: "#555" }} />
              <YAxis
                label={{ value: "Spread (%)", angle: -90, position: "insideLeft", fill: "#444" }}
                tick={{ fill: "#555" }}
              />
              <Tooltip
                contentStyle={{
                  background: "#fff",
                  borderRadius: "10px",
                  border: "1px solid #f9d949",
                }}
              />
              <Bar dataKey="spread" fill="#f9d949" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-gray-500">No credit risk data available.</p>
        )}
      </div>
    </main>
  );
}
