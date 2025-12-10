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

type Range = "1D" | "5D" | "1M" | "6M" | "YTD" | "1Y" | "5Y" | "ALL";

export default function CryptoDetailPage() {
  const { symbol } = useParams();
  const router = useRouter();
  const apiKey = process.env.NEXT_PUBLIC_FMP_API_KEY;

  const [data, setData] = useState<HistoricalData[]>([]);
  const [price, setPrice] = useState<number | null>(null);
  const [change, setChange] = useState<number | null>(null);
  const [percent, setPercent] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeRange, setActiveRange] = useState<Range>("1M");
  const [error, setError] = useState<string | null>(null);

  const ranges: Range[] = ["1D", "5D", "1M", "6M", "YTD", "1Y", "5Y", "ALL"];

  useEffect(() => {
    const fetchCryptoData = async () => {
      try {
        setLoading(true);

        // 1️⃣ Live quote
        const quoteRes = await fetch(
          `https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${apiKey}`
        );
        const quoteData = await quoteRes.json();
        if (quoteData && quoteData.length > 0) {
          setPrice(quoteData[0].price);
          setChange(quoteData[0].change);
          setPercent(quoteData[0].changesPercentage);
        }

        // 2️⃣ Historical data
        const histRes = await fetch(
          `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?apikey=${apiKey}`
        );
        const histData = await histRes.json();

        const parsed = histData?.historical
          ?.slice()
          .reverse()
          .map((h: any) => ({
            date: h.date,
            close: h.close,
          }));

        setData(parsed || []);
      } catch (err: any) {
        console.error(err);
        setError("Failed to load crypto details.");
      } finally {
        setLoading(false);
      }
    };

    if (symbol) fetchCryptoData();
  }, [symbol, apiKey]);

  const filterByRange = (range: Range): HistoricalData[] => {
    if (!data.length) return [];

    const today = new Date(data[data.length - 1].date);
    const start = new Date(today);

    switch (range) {
      case "1D":
        start.setDate(today.getDate() - 1);
        break;
      case "5D":
        start.setDate(today.getDate() - 5);
        break;
      case "1M":
        start.setMonth(today.getMonth() - 1);
        break;
      case "6M":
        start.setMonth(today.getMonth() - 6);
        break;
      case "YTD":
        start.setMonth(0);
        start.setDate(1);
        break;
      case "1Y":
        start.setFullYear(today.getFullYear() - 1);
        break;
      case "5Y":
        start.setFullYear(today.getFullYear() - 5);
        break;
      case "ALL":
      default:
        return data;
    }

    return data.filter((d) => new Date(d.date) >= start);
  };

  const chartData = filterByRange(activeRange);

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500 text-lg">
        Loading {symbol} data...
      </div>
    );

  if (error)
    return (
      <div className="flex items-center justify-center min-h-screen text-red-500">
        {error}
      </div>
    );

  return (
    <main className="min-h-screen bg-white text-gray-900 px-6 pt-36 pb-20">
      <div className="max-w-6xl mx-auto">
        {/* Back buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-black"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Screener
          </button>

          <button
            onClick={() => router.push("/features")}
            className="text-sm text-blue-600 hover:underline"
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
          <h1 className="text-4xl font-bold mb-2">{symbol} Price Chart</h1>
          {price && (
            <p className="text-3xl font-semibold">
              ${price.toLocaleString()}{" "}
              <span
                className={`text-lg ml-2 ${
                  percent && percent >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {change && change.toFixed(2)} ({percent && percent.toFixed(2)}%)
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
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="bg-gray-50 p-6 rounded-2xl shadow-sm">
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
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
                  background: "white",
                  borderRadius: "10px",
                  border: "1px solid #e5e7eb",
                }}
              />
              <Line
                type="monotone"
                dataKey="close"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <p className="text-xs text-gray-400 text-center mt-4">
          Historical and real-time data powered by WallStreetStocks.ai
        </p>
      </div>
    </main>
  );
}
