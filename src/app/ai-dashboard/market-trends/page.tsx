"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Sparkles,
  Gauge,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { useRouter } from "next/navigation";

// ENV KEYS
const FMP_API_KEY = process.env.NEXT_PUBLIC_FMP_API_KEY;

export default function MarketTrendsPage() {
  const router = useRouter();

  const [gainers, setGainers] = useState<any[]>([]);
  const [losers, setLosers] = useState<any[]>([]);
  const [indices, setIndices] = useState<any[]>([]);
  const [sectorData, setSectorData] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [aiInsight, setAiInsight] = useState("");
  const [sentiment, setSentiment] = useState<number | null>(null);
  const [aiSentimentComment, setAiSentimentComment] = useState("");
  const [loading, setLoading] = useState(true);

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [gainersRes, losersRes, indexRes, sectorRes, fearGreedRes] =
          await Promise.all([
            fetch(
              `https://financialmodelingprep.com/api/v3/stock_market/gainers?apikey=${FMP_API_KEY}`
            ),
            fetch(
              `https://financialmodelingprep.com/api/v3/stock_market/losers?apikey=${FMP_API_KEY}`
            ),
            fetch(
              `https://financialmodelingprep.com/api/v3/quotes/index?apikey=${FMP_API_KEY}`
            ),
            fetch(
              `https://financialmodelingprep.com/api/v3/stock/sectors-performance?apikey=${FMP_API_KEY}`
            ),
            fetch(
              `https://financialmodelingprep.com/api/v4/fear_greed_index?apikey=${FMP_API_KEY}`
            ).catch(() => null),
          ]);

        const [gainersJson, losersJson, indexJson, sectorJson, fgJson] =
          await Promise.all([
            gainersRes.json(),
            losersRes.json(),
            indexRes.json(),
            sectorRes.json(),
            fearGreedRes ? fearGreedRes.json() : [],
          ]);

        setGainers(gainersJson.slice(0, 5));
        setLosers(losersJson.slice(0, 5));
        setIndices(indexJson.slice(0, 6));
        setSectorData(sectorJson.sectorPerformance || sectorJson);

        const chart = indexJson.slice(0, 5).map((i: any) => ({
          name: i.symbol,
          change: i.changesPercentage,
        }));
        setChartData(chart);

        const fgScore =
          fgJson?.data?.value ||
          Math.min(
            100,
            Math.max(
              0,
              50 +
                (Math.random() - 0.5) * 20 +
                (indices[0]?.changesPercentage || 0) * 2
            )
          );
        setSentiment(fgScore);

        await generateAIInsights(
          gainersJson,
          losersJson,
          indexJson,
          sectorJson,
          fgScore
        );
      } catch (err) {
        console.error("Market data fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // AI summary and sentiment interpretation
  const generateAIInsights = async (
    gainers: any[],
    losers: any[],
    indices: any[],
    sectors: any[],
    fgScore: number
  ) => {
    try {
      const text = `
      Fear & Greed Index: ${fgScore}.
      Top Gainers: ${gainers
        .slice(0, 5)
        .map((g) => `${g.symbol} +${g.changesPercentage}%`)
        .join(", ")}.
      Top Losers: ${losers
        .slice(0, 5)
        .map((l) => `${l.symbol} ${l.changesPercentage}%`)
        .join(", ")}.
      Major Indices: ${indices
        .slice(0, 5)
        .map((i) => `${i.symbol} ${i.changesPercentage}%`)
        .join(", ")}.
      Sector Performance: ${sectors
        .slice(0, 10)
        .map((s: any) => `${s.sector}: ${s.changesPercentage}%`)
        .join(", ")}.
      Provide two sections:
      1️⃣ 100-word Market Insight summary.
      2️⃣ 1-line interpretation of sentiment index (0–100) using tone emojis.
      `;

      // ✅ secure API call (server-side)
      const res = await fetch("/api/ai-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });

      const json = await res.json();
      const output = json.insight || "No AI insights available.";
      const [insightPart, sentimentPart] = output.split("2️⃣") || [
        output,
        "Unable to interpret sentiment.",
      ];

      setAiInsight(insightPart.trim());
      setAiSentimentComment(sentimentPart.trim());
    } catch (error) {
      console.error("AI insight error:", error);
      setAiInsight("Could not generate AI insights.");
      setAiSentimentComment("Sentiment unavailable.");
    }
  };

  const gaugeColor = (score: number) => {
    if (score < 25) return "#ef4444";
    if (score < 50) return "#f59e0b";
    if (score < 75) return "#84cc16";
    return "#22c55e";
  };

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
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to AI Dashboard
          </button>

          <div className="flex items-center gap-2">
            <Activity className="text-green-500" />
            <h1 className="text-3xl font-bold">
              Market Trends, Sectors & Sentiment
            </h1>
          </div>
        </div>

        <p className="text-gray-600 mb-10">
          Real-time market overview powered by WallStreetStocks.ai analysis:
          indices, sector rotation, and sentiment.
        </p>

        {/* Gainers / Losers / Indices cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Gainers */}
          <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
              <TrendingUp className="h-5 w-5 text-green-600 mr-2" /> Top Gainers
            </h3>
            {loading ? (
              <p className="text-gray-400 text-sm">Loading…</p>
            ) : (
              <ul className="text-sm text-gray-700 space-y-1">
                {gainers.map((g) => (
                  <li key={g.symbol}>
                    <strong>{g.symbol}</strong> +{g.changesPercentage.toFixed(2)}%
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Losers */}
          <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
              <TrendingDown className="h-5 w-5 text-red-600 mr-2" /> Top Losers
            </h3>
            {loading ? (
              <p className="text-gray-400 text-sm">Loading…</p>
            ) : (
              <ul className="text-sm text-gray-700 space-y-1">
                {losers.map((l) => (
                  <li key={l.symbol}>
                    <strong>{l.symbol}</strong> {l.changesPercentage.toFixed(2)}%
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Indices */}
          <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
              <BarChart3 className="h-5 w-5 text-blue-600 mr-2" /> Major Indices
            </h3>
            {loading ? (
              <p className="text-gray-400 text-sm">Loading…</p>
            ) : (
              <ul className="text-sm text-gray-700 space-y-1">
                {indices.map((i) => (
                  <li key={i.symbol}>
                    <strong>{i.symbol}</strong>{" "}
                    {i.changesPercentage > 0 ? "+" : ""}
                    {i.changesPercentage.toFixed(2)}%
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Index chart */}
        <div className="bg-gray-50 p-6 rounded-2xl mb-10 border border-gray-100 h-96">
          {loading ? (
            <p className="text-center text-gray-400 mt-36">Loading chart…</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="change"
                  stroke="#22c55e"
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Sector heatmap */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold mb-4">Sector Rotation</h2>
          {loading ? (
            <p className="text-gray-400">Loading sector data…</p>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={sectorData}>
                <XAxis dataKey="sector" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="changesPercentage">
                  {sectorData.map((entry: any, idx: number) => (
                    <Cell
                      key={`cell-${idx}`}
                      fill={
                        entry.changesPercentage > 0 ? "#22c55e" : "#ef4444"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* AI Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-10"
        >
          <div className="flex items-center mb-2">
            <Sparkles className="h-5 w-5 text-green-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">
              AI Market Summary
            </h2>
          </div>
          {aiInsight ? (
            <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
              {aiInsight}
            </p>
          ) : (
            <p className="text-gray-500 text-sm">Generating insights…</p>
          )}
        </motion.div>

        {/* Fear & Greed Gauge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="bg-gray-100 border border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center"
        >
          <div className="flex items-center gap-2 mb-2">
            <Gauge
              className="h-5 w-5"
              color={sentiment ? gaugeColor(sentiment) : "#9ca3af"}
            />
            <h2 className="text-lg font-semibold text-gray-800">
              Fear & Greed Index
            </h2>
          </div>

          {sentiment === null ? (
            <p className="text-gray-500 text-sm">Loading sentiment…</p>
          ) : (
            <>
              <div className="relative w-72 h-3 bg-gray-200 rounded-full overflow-hidden mb-3">
                <motion.div
                  className="absolute left-0 top-0 h-3 rounded-full"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${sentiment}%`,
                    backgroundColor: gaugeColor(sentiment),
                  }}
                  transition={{ duration: 1 }}
                />
              </div>
              <p
                className="text-sm font-medium"
                style={{ color: gaugeColor(sentiment) }}
              >
                {sentiment.toFixed(0)} / 100
              </p>
              <p className="text-gray-700 text-sm mt-2 text-center max-w-md">
                {aiSentimentComment || "Analyzing market mood..."}
              </p>
            </>
          )}
        </motion.div>

        {/* Footer */}
        <div className="mt-10 text-center">
          <button
            onClick={() =>
              alert("Coming soon – Advanced Quant Sentiment Analytics")
            }
            className="bg-green-500 hover:bg-green-600 text-white font-semibold px-8 py-3 rounded-full transition"
          >
            Explore →
          </button>
        </div>
      </motion.div>
    </div>
  );
}
