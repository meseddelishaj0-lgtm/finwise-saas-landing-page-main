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

// Regional credit spreads have no source on our market-data provider. The
// closest honest substitute is the day's move in listed credit ETFs (high
// yield, investment grade, emerging markets, leveraged loans), served by
// /api/derivatives. The chart shows fund price changes, not spreads.

export default function CreditRiskInsights() {
  const [data, setData] = useState<any[]>([]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch live credit ETF quotes
  const fetchCreditSpreads = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/derivatives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "credit" }),
      });
      const json = await res.json();

      const rows = (Array.isArray(json?.data) ? json.data : [])
        .filter((q: any) => typeof q.changesPercentage === "number")
        .map((q: any) => ({
          symbol: q.symbol,
          name: q.name,
          change: Number(q.changesPercentage.toFixed(2)),
        }));
      setData(rows);
      setNote(json?.note || "");
    } catch (err) {
      console.error("Error fetching credit ETF quotes:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreditSpreads();
  }, []);

  return (
    <main className="min-h-screen bg-night text-[#111] px-6 md:px-14 py-14">
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
        <h1 className="text-4xl text-[#111] font-display font-normal tracking-tight md:text-5xl">
          Credit Risk Insights
        </h1>
        <p className="text-lg text-gray-400 mt-3">
          AI-based credit scoring blending ratings, spreads, and sentiment for forward risk.
        </p>
      </div>

      {/* Feature Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-10">
        <div className="bg-surface border border-gold/20 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-lg mb-2 text-[#111]">Issuer Trend</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Tracks credit quality movement for corporate and sovereign issuers
            using rating transitions and yield spreads.
          </p>
        </div>
        <div className="bg-surface border border-gold/20 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-lg mb-2 text-[#111]">Sector Model</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Identifies sector-level credit risks and default probabilities
            based on debt metrics and market sentiment.
          </p>
        </div>
        <div className="bg-surface border border-gold/20 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-lg mb-2 text-[#111]">Macro Stress</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Measures credit spread sensitivity to macroeconomic shocks like
            inflation, growth slowdown, or rate hikes.
          </p>
        </div>
      </div>

      {/* Chart Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-[#111]">
          Credit ETF Daily Move
        </h2>
        <button
          onClick={fetchCreditSpreads}
          className="bg-[#f9d949] hover:bg-[#f7c948] px-4 py-2 rounded-xl flex items-center gap-2 font-semibold transition"
        >
          <RefreshCcw className="w-4 h-4" /> Refresh
        </button>
      </div>
      {note && (
        <p className="text-sm text-gray-500 mb-4">
          {note} Bars show each fund&apos;s daily price change, not a spread.
        </p>
      )}

      {/* Bar Chart */}
      <div className="bg-surface border border-gold/20 rounded-2xl p-6 shadow-md">
        {loading ? (
          <p className="text-center text-gray-500">Loading credit risk data...</p>
        ) : data.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f2eecb" />
              <XAxis dataKey="symbol" tick={{ fill: "#555" }} />
              <YAxis
                label={{ value: "Daily change (%)", angle: -90, position: "insideLeft", fill: "#444" }}
                tick={{ fill: "#555" }}
              />
              <Tooltip
                formatter={(value) => [`${value}%`, "Daily change"]}
                contentStyle={{
                  background: "#161410",
                  borderRadius: "10px",
                  border: "1px solid #f9d949",
                }}
              />
              <Bar dataKey="change" fill="#f9d949" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-gray-500">No credit risk data available.</p>
        )}
      </div>
    </main>
  );
}
