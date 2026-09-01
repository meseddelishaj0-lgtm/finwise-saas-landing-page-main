"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Brain,
  TrendingUp,
  BarChart3,
  Zap,
  RefreshCw,
  ArrowLeft,
  LineChart as ChartIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

// Define the types
interface TrendPoint {
  day: string;
  value: number;
}

interface ForecastData {
  confidence: number;
  sentiment: string;
  risk: string;
  trend: TrendPoint[];
  comment: string;
}

export default function ForecastPage() {
  const [data, setData] = useState<ForecastData>({
    confidence: 0,
    sentiment: "Loading...",
    risk: "Loading...",
    trend: [],
    comment: "Analyzing market sentiment...",
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/forecast");
        const json = await res.json();

        const aiComment =
          json.sentiment === "Bullish"
            ? "AI models detect optimism across growth sectors. Expect continued momentum this week."
            : json.sentiment === "Bearish"
            ? "Caution: AI signals weakness and increased volatility in risk assets."
            : "AI models show mixed signals — neutral positioning may be best for now.";

        // Create demo trend
        const simulatedTrend: TrendPoint[] = Array.from({ length: 7 }).map(
          (_, i) => ({
            day: `Day ${i + 1}`,
            value: Math.round(json.confidence - 5 + Math.random() * 10),
          })
        );

        setData({
          confidence: json.confidence ?? 75,
          sentiment: json.sentiment ?? "Neutral",
          risk: json.risk ?? "Moderate",
          trend: simulatedTrend,
          comment: aiComment,
        });
      } catch (e) {
        console.error("Forecast error:", e);

        const fallbackTrend: TrendPoint[] = Array.from({ length: 7 }).map(
          (_, i) => ({
            day: `Day ${i + 1}`,
            value: 70 + Math.random() * 5,
          })
        );

        setData({
          confidence: 72,
          sentiment: "Neutral",
          risk: "Moderate",
          trend: fallbackTrend,
          comment:
            "Using fallback data: market stability remains moderate with mixed short-term signals.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <section className="min-h-screen pt-10 pb-16 px-6 bg-night">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl mb-3 text-gold font-display font-normal tracking-tight">
            AI Market Forecast
          </h1>
          <p className="text-gray-400 text-lg max-w-3xl mx-auto">
            Real-time AI-powered outlook combining sentiment, volatility, and
            probability models to forecast short-term market movements.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Last Updated: {new Date().toLocaleDateString("en-US")}
          </p>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-16 text-gray-500">
            <RefreshCw className="w-10 h-10 mx-auto mb-3 animate-spin" />
            Generating AI insights...
          </div>
        ) : (
          <>
            {/* Metric Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="rounded-2xl bg-gradient-to-br from-green-100 to-green-50 shadow-md p-6 text-center">
                <TrendingUp className="w-10 h-10 text-green-400 mx-auto mb-2" />
                <h3 className="text-lg font-bold">AI Confidence</h3>
                <p className="text-4xl font-extrabold text-green-400">
                  {data.confidence}%
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  Forecast accuracy probability
                </p>
              </div>

              <div className="rounded-2xl shadow-md p-6 text-center bg-surface">
                <Brain className="w-10 h-10 text-gold mx-auto mb-2" />
                <h3 className="text-lg font-bold">Market Sentiment</h3>
                <p
                  className={`text-4xl font-extrabold ${
 data.sentiment === "Bullish"
 ? "text-green-400"
 : data.sentiment === "Bearish"
 ? "text-red-500"
 : "text-gray-300"
 }`}
                >
                  {data.sentiment}
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  AI sentiment indicator
                </p>
              </div>

              <div className="rounded-2xl shadow-md p-6 text-center bg-surface">
                <BarChart3 className="w-10 h-10 text-gold-soft mx-auto mb-2" />
                <h3 className="text-lg font-bold">Risk Level</h3>
                <p
                  className={`text-4xl font-extrabold ${
 data.risk === "Low"
 ? "text-green-400"
 : data.risk === "Moderate"
 ? "text-gold"
 : "text-red-400"
 }`}
                >
                  {data.risk}
                </p>
                <p className="text-gray-500 text-sm mt-1">Volatility Index</p>
              </div>
            </div>

            {/* AI Market Commentary */}
            <div className="bg-surface rounded-2xl shadow-lg border p-8 mb-12">
              <div className="flex items-center gap-3 mb-3">
                <Zap className="w-6 h-6 text-gold" />
                <h4 className="font-bold text-lg text-gray-100">
                  AI Market Commentary
                </h4>
              </div>
              <p className="text-gray-300 text-base leading-relaxed">
                {data.comment}
              </p>
            </div>

            {/* Confidence Trend Chart */}
            <div className="bg-surface2 p-8 rounded-2xl shadow mb-12">
              <h3 className="text-xl font-bold text-gold mb-4 flex items-center gap-2">
                <ChartIcon className="w-6 h-6" /> Confidence Trend (7 Days)
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data.trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis domain={[60, 100]} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Buttons */}
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 bg-gold text-night font-semibold px-6 py-3 rounded-xl hover:bg-gold-deep transition"
              >
                <RefreshCw className="w-5 h-5" /> Refresh Forecast
              </button>

              <Link
                href="/ai-dashboard"
                className="flex items-center gap-2 bg-yellow-400 text-black font-semibold px-6 py-3 rounded-xl hover:bg-gold transition"
              >
                <ArrowLeft className="w-5 h-5" /> Back to AI Dashboard
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
