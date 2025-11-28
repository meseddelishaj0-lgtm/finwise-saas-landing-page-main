"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { ArrowLeft, RefreshCcw } from "lucide-react";
import Link from "next/link";

const FMP_KEY = process.env.NEXT_PUBLIC_FMP_API_KEY!;

interface YieldData {
  maturity: string;
  yield: number;
}

export default function YieldCurveVisualizer() {
  const [data, setData] = useState<YieldData[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchYieldCurve = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://financialmodelingprep.com/api/v4/treasury?apikey=${FMP_KEY}`
      );
      const raw = await res.json();
      // Pick most recent yields
      const latest = raw[0];
      if (latest) {
        const mapped: YieldData[] = [
          { maturity: "1M", yield: latest.oneMonth },
          { maturity: "3M", yield: latest.threeMonth },
          { maturity: "6M", yield: latest.sixMonth },
          { maturity: "1Y", yield: latest.oneYear },
          { maturity: "2Y", yield: latest.twoYear },
          { maturity: "3Y", yield: latest.threeYear },
          { maturity: "5Y", yield: latest.fiveYear },
          { maturity: "7Y", yield: latest.sevenYear },
          { maturity: "10Y", yield: latest.tenYear },
          { maturity: "20Y", yield: latest.twentyYear },
          { maturity: "30Y", yield: latest.thirtyYear },
        ];
        setData(mapped);
      }
    } catch (err) {
      console.error("Error fetching yield curve:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchYieldCurve();
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
          Yield Curve Visualizer
        </h1>
        <p className="text-lg text-gray-600 mt-3">
          Interactive yield curves with macro overlays and forecast tracking.
        </p>
      </div>

      {/* Feature Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white border border-yellow-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-lg mb-2 text-[#111]">Slope</h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            Measures the difference between short- and long-term yields —
            indicating economic growth expectations.
          </p>
        </div>
        <div className="bg-white border border-yellow-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-lg mb-2 text-[#111]">Butterfly</h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            Analyzes curvature changes by comparing mid-term yields with short
            and long maturities.
          </p>
        </div>
        <div className="bg-white border border-yellow-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-lg mb-2 text-[#111]">Carry/Roll</h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            Tracks potential yield gains from holding or rolling down the curve
            as maturities shorten.
          </p>
        </div>
      </div>

      {/* Chart Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-[#111]">U.S. Treasury Yield Curve</h2>
        <button
          onClick={fetchYieldCurve}
          className="bg-[#f9d949] hover:bg-[#f7c948] px-4 py-2 rounded-xl flex items-center gap-2 font-semibold transition"
        >
          <RefreshCcw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Chart */}
      <div className="bg-white border border-yellow-200 rounded-2xl p-6 shadow-md">
        {loading ? (
          <p className="text-center text-gray-500">Loading yield data...</p>
        ) : data.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f2eecb" />
              <XAxis dataKey="maturity" tick={{ fill: "#666" }} />
              <YAxis
                tick={{ fill: "#666" }}
                label={{ value: "Yield (%)", angle: -90, position: "insideLeft", fill: "#444" }}
              />
              <Tooltip
                contentStyle={{
                  background: "#fff",
                  borderRadius: "10px",
                  border: "1px solid #f9d949",
                }}
              />
              <Line
                type="monotone"
                dataKey="yield"
                stroke="#f9d949"
                strokeWidth={3}
                dot={{ r: 4, fill: "#f9d949" }}
                activeDot={{ r: 6, fill: "#f7c948" }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-gray-500">No yield data available.</p>
        )}
      </div>
    </main>
  );
}
