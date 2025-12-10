"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  LineChart as LineChartIcon,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  Legend,
  Cell,
} from "recharts";
import { useRouter } from "next/navigation";

// ENV KEYS
const FMP_API_KEY = process.env.NEXT_PUBLIC_FMP_API_KEY;

export default function PrivateMarketsGrowthPage() {
  const router = useRouter();

  const [fundData, setFundData] = useState<any[]>([]);
  const [irrData, setIrrData] = useState<any[]>([]);
  const [aiSummary, setAiSummary] = useState("");
  const [loading, setLoading] = useState(true);

  // Fetch mock fund data + AI insight
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Example FMP endpoint for private market proxies
        const res = await fetch(
          `https://financialmodelingprep.com/api/v4/etf-sector-allocation?symbol=XLK&apikey=${FMP_API_KEY}`
        );
        const json = await res.json();

        // Simulated PE/VC/HF growth & IRR dataset
        const data = [
          { name: "Private Equity", TVPI: 2.3, IRR: 15.1, Calls: 4.2 },
          { name: "Venture Capital", TVPI: 3.1, IRR: 22.4, Calls: 6.8 },
          { name: "Hedge Funds", TVPI: 1.8, IRR: 10.9, Calls: 2.7 },
        ];
        setFundData(data);

        const irrSeries = data.map((d) => ({
          name: d.name,
          IRR: d.IRR,
          Vintage: 2018 + Math.floor(Math.random() * 6),
        }));
        setIrrData(irrSeries);

        // Prompt AI to summarize trends
        const prompt = `
        Provide a concise institutional-style market commentary (120 words max)
        about Private Equity, Venture Capital, and Hedge Fund growth trends.
        Mention TVPI, IRR dispersion, and capital call patterns.
        Use a professional tone for asset managers and investors.
        `;

        const aiRes = await fetch("/api/ai-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });

        const aiJson = await aiRes.json();
        setAiSummary(aiJson.insight || "No AI insights available.");
      } catch (err) {
        console.error("Error fetching private markets data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 py-20 px-6 md:px-16">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-7xl mx-auto bg-white rounded-3xl shadow-lg border border-gray-100 p-10"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-8 flex-wrap gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Features
          </button>

          <div className="flex items-center gap-2">
            <TrendingUp className="text-yellow-500" />
            <h1 className="text-3xl font-bold">Private Markets Growth</h1>
          </div>
        </div>

        <p className="text-gray-600 mb-10">
          AI projections for PE/VC growth, IRR bands, and capital distributions
          across vintage years. Powered by WallStreetStocks.ai intelligence.
        </p>

        {/* TVPI Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="bg-yellow-50 p-6 rounded-2xl mb-10 border border-yellow-100"
        >
          <div className="flex items-center mb-2">
            <BarChart3 className="h-5 w-5 text-yellow-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">
              TVPI Comparison
            </h2>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={fundData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="TVPI" fill="#facc15" radius={[8, 8, 0, 0]}>
                {fundData.map((_, i) => (
                  <Cell key={i} fill="#fbbf24" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* IRR Line Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="bg-yellow-50 p-6 rounded-2xl mb-10 border border-yellow-100"
        >
          <div className="flex items-center mb-2">
            <LineChartIcon className="h-5 w-5 text-yellow-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">
              IRR Bands by Vintage
            </h2>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={irrData}>
              <XAxis dataKey="Vintage" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="IRR"
                stroke="#facc15"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* AI Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 mb-10"
        >
          <div className="flex items-center mb-2">
            <Sparkles className="h-5 w-5 text-yellow-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">
              AI Market Insight
            </h2>
          </div>
          {loading ? (
            <p className="text-gray-500 text-sm">Loading insights...</p>
          ) : (
            <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-line">
              {aiSummary}
            </p>
          )}
        </motion.div>

        {/* Footer CTA */}
        <div className="text-center">
          <button
            onClick={() => alert("Coming soon – Private Markets Analytics Pro")}
            className="bg-yellow-400 hover:bg-yellow-500 text-white font-semibold px-8 py-3 rounded-full transition"
          >
            Explore →
          </button>
        </div>
      </motion.div>
    </div>
  );
}
