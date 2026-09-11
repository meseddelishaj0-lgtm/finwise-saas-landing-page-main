"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ArrowLeft } from "lucide-react";

interface HistoricalData {
  date: string;
  close: number;
}

type Range = "1D" | "5D" | "1M" | "6M" | "YTD" | "1Y" | "5Y";

// Each tab maps onto a /api/market/chart range. YTD is cut from the 1Y
// series; 5Y (weekly bars) is the longest history the route serves.
const CHART_RANGE: Record<Range, string> = {
  "1D": "1D",
  "5D": "5D",
  "1M": "1M",
  "6M": "6M",
  YTD: "1Y",
  "1Y": "1Y",
  "5Y": "5Y",
};

export default function CryptoDetailPage() {
  const params = useParams();
  const router = useRouter();

  // The URL carries the slash-free form (BTCUSD); the data routes accept it
  // and map it to the BTC/USD pair.
  const raw = params?.symbol;
  const symbol = decodeURIComponent(
    String(Array.isArray(raw) ? raw[0] : raw || "")
  ).toUpperCase();
  const pair =
    symbol.includes("/") || !symbol.endsWith("USD")
      ? symbol
      : `${symbol.slice(0, -3)}/USD`;

  const [data, setData] = useState<HistoricalData[]>([]);
  const [price, setPrice] = useState<number | null>(null);
  const [change, setChange] = useState<number | null>(null);
  const [percent, setPercent] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [activeRange, setActiveRange] = useState<Range>("1M");
  const [error, setError] = useState<string | null>(null);

  const ranges: Range[] = ["1D", "5D", "1M", "6M", "YTD", "1Y", "5Y"];

  // Live quote
  useEffect(() => {
    const fetchQuote = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/market/quotes?symbols=${encodeURIComponent(symbol)}`
        );
        const json = await res.json();
        const q = Array.isArray(json) ? json[0] : null;
        if (q && typeof q.price === "number" && q.price > 0) {
          setPrice(q.price);
          setChange(typeof q.change === "number" ? q.change : null);
          setPercent(typeof q.changePercent === "number" ? q.changePercent : null);
        }
      } catch (err: any) {
        // The chart can still render without the header quote.
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (symbol) fetchQuote();
  }, [symbol]);

  // Historical series for the active range
  useEffect(() => {
    let cancelled = false;

    const fetchSeries = async () => {
      try {
        setChartLoading(true);
        setError(null);
        const res = await fetch(
          `/api/market/chart?symbol=${encodeURIComponent(symbol)}&range=${CHART_RANGE[activeRange]}`
        );
        const bars = await res.json();
        if (!Array.isArray(bars) || bars.length === 0) throw new Error("No data");

        // Bars are ascending: { t, o, h, l, c, v }
        let rows: HistoricalData[] = bars.map((b: any) => ({
          date: String(b.t),
          close: b.c,
        }));
        if (activeRange === "YTD") {
          const year = rows[rows.length - 1].date.slice(0, 4);
          rows = rows.filter((r) => r.date >= `${year}-01-01`);
        }
        if (!cancelled) setData(rows);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setData([]);
          setError("No chart data available for this range.");
        }
      } finally {
        if (!cancelled) setChartLoading(false);
      }
    };

    if (symbol) fetchSeries();
    return () => {
      cancelled = true;
    };
  }, [symbol, activeRange]);

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500 text-lg">
        Loading {pair} data...
      </div>
    );

  return (
    <main className="min-h-screen bg-night text-ivory px-6 pt-12 pb-20">
      <div className="max-w-6xl mx-auto">
        {/* Back buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-ivory"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Screener
          </button>

          <button
            onClick={() => router.push("/features")}
            className="text-sm text-gold hover:underline"
          >
            ← Back to Features
          </button>
        </div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-6"
        >
          <h1 className="text-4xl mb-2 font-display font-normal tracking-tight md:text-5xl">{pair} Price Chart</h1>
          {price !== null && (
            <p className="text-3xl font-semibold">
              ${price.toLocaleString()}{" "}
              <span
                className={`text-lg ml-2 ${
 (percent ?? 0) >= 0
 ? "text-green-400"
 : "text-red-400"
 }`}
              >
                {change !== null ? change.toFixed(2) : "—"} (
                {percent !== null ? percent.toFixed(2) : "—"}%)
              </span>
            </p>
          )}
        </motion.div>

        {/* Time Range Tabs */}
        <div className="flex justify-center mb-4 flex-wrap gap-2">
          {ranges.map((r) => (
            <button
              key={r}
              onClick={() => setActiveRange(r)}
              className={`px-4 py-1 rounded-full text-sm font-medium transition-all ${
 activeRange === r
 ? "bg-gold text-night shadow-sm"
 : "bg-surface2 text-gray-300 hover:bg-white/10"
 }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="bg-surface2 p-6 rounded-2xl shadow-sm">
          {chartLoading || error ? (
            <div className="h-[400px] flex items-center justify-center text-gray-500">
              {chartLoading ? "Loading chart…" : error}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={data}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  // Intraday bars carry a time: show "MM-DD HH:MM".
                  tickFormatter={(t: string) => (t.length > 10 ? t.slice(5, 16) : t)}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={70}
                />
                <Tooltip
                  contentStyle={{
                    background: "#161410",
                    borderRadius: "10px",
                    border: "1px solid #e5e7eb",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="close"
                  stroke="#FACC15"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <p className="text-xs text-gray-400 text-center mt-4">
          Historical and real-time data powered by WallStreetStocks.ai
        </p>
      </div>
    </main>
  );
}
