"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { RefreshCcw } from "lucide-react";

interface SeriesData {
  date: string;
  value: number;
}

export default function Page() {
  const [data, setData] = useState<Record<string, SeriesData[]>>({});
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/money-market");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Money Market fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Get most recent observation for summary cards
  const latest = Object.entries(data).map(([name, values]) => ({
    name,
    value: values?.[values.length - 1]?.value || 0,
  }));

  // Chart data — use 10-Year, 1-Year, 3-Month, Fed Funds
  const chartData =
    data["10-Year Treasury"]?.map((_, i) => ({
      date: data["10-Year Treasury"][i]?.date,
      "10-Year": data["10-Year Treasury"][i]?.value,
      "1-Year": data["1-Year Treasury"]?.[i]?.value,
      "3-Month": data["3-Month Treasury"]?.[i]?.value,
      "Fed Funds": data["Federal Funds Rate"]?.[i]?.value,
    })) || [];

  return (
    <main className="min-h-screen bg-white text-gray-900 flex flex-col items-center py-24 px-6">
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl text-center mb-12"
      >
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
          Money Market Dashboard
        </h1>
        <p className="text-lg text-gray-600">
          Explore real-time short-term interest rates, Treasury yields, repo and
          CD rates — straight from the Federal Reserve.
        </p>
      </motion.section>

      {/* Refresh Button */}
      <button
        onClick={fetchData}
        disabled={loading}
        className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-5 py-3 rounded-xl transition-all mb-10"
      >
        <RefreshCcw className="w-5 h-5" />
        {loading ? "Refreshing..." : "Refresh Data"}
      </button>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-6xl w-full mb-14">
        {latest.map((item, index) => (
          <motion.div
            key={index}
            whileHover={{ scale: 1.03 }}
            className="bg-gray-50 border border-gray-200 rounded-2xl shadow-md p-6 text-center"
          >
            <h3 className="text-sm font-semibold mb-2 text-gray-800">
              {item.name}
            </h3>
            <p className="text-2xl font-bold text-yellow-500">
              {item.value ? item.value.toFixed(2) + "%" : "—"}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Yield Chart */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="bg-gray-50 border border-gray-200 rounded-2xl shadow-md p-8 max-w-6xl w-full mb-16"
      >
        <h3 className="text-2xl font-semibold mb-6 text-center text-gray-800">
          Yield Curve & Short-Term Rates (Last 60 Days)
        </h3>
        {loading || !chartData.length ? (
          <p className="text-center text-gray-500">Loading data...</p>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={["auto", "auto"]} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="10-Year"
                stroke="#FACC15"
                strokeWidth={3}
              />
              <Line
                type="monotone"
                dataKey="1-Year"
                stroke="#1E293B"
                strokeWidth={3}
              />
              <Line
                type="monotone"
                dataKey="3-Month"
                stroke="#7C3AED"
                strokeWidth={3}
              />
              <Line
                type="monotone"
                dataKey="Fed Funds"
                stroke="#16A34A"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* About Section */}
      <div className="max-w-4xl text-center mb-12">
        <h2 className="text-2xl font-semibold mb-4">About This Data</h2>
        <p className="text-gray-600 leading-relaxed">
          Data sourced directly from the Federal Reserve’s FRED — including
          the Treasury yield curve (1M–30Y), overnight reverse repo facility,
          certificate of deposit rates, and the effective federal funds rate.
          Updated daily to reflect current market liquidity conditions and rate
          policy stance.
        </p>
      </div>

      {/* CTA Section */}
      <div className="text-center">
        <h3 className="text-2xl font-semibold mb-3 text-gray-900">
          Monitor the Pulse of Global Liquidity
        </h3>
        <p className="text-gray-600 mb-6">
          Join WallStreetStocks.ai to unlock advanced analytics on bonds,
          money-market funds, repo markets, and short-term instruments.
        </p>
        <a
          href="/register"
          className="inline-block bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-6 py-3 rounded-xl transition-all"
        >
          Unlock Full Access
        </a>
      </div>
    </main>
  );
}
