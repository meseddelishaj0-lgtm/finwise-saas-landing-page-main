"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ArrowLeft, RefreshCcw } from "lucide-react";
import Link from "next/link";

// Dealer axes and TRACE prints are not sold by our market-data provider. The
// closest honest liquidity measure it does carry is turnover: the day's dollar
// volume (price x shares traded) in the Treasury ETF at each maturity bucket,
// from /api/bonds. It shows where trading activity sits on the curve.

export default function LiquidityHeatmap() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch Treasury ETF turnover by maturity bucket
  const fetchLiquidityData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bonds");
      const json = await res.json();
      const ladder = Array.isArray(json?.ladder) ? json.ladder : [];

      const mapped = ladder
        .filter(
          (l: any) =>
            typeof l.price === "number" &&
            typeof l.volume === "number" &&
            l.volume > 0
        )
        .map((l: any) => ({
          bucket: l.bucket,
          symbol: l.symbol,
          turnover: Number(((l.price * l.volume) / 1e6).toFixed(1)),
        }));

      setData(mapped);
    } catch (err) {
      console.error("Error fetching liquidity data:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiquidityData();
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
          Liquidity Heatmap
        </h1>
        <p className="text-lg text-gray-400 mt-3">
          See where trading activity sits along the Treasury curve.
        </p>
      </div>

      {/* Feature Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-10">
        <div className="bg-surface border border-gold/20 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-lg mb-2 text-[#111]">Turnover by Maturity</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            The day&apos;s dollar volume in the Treasury ETF for each maturity
            bucket, from bills to long bonds.
          </p>
        </div>
        <div className="bg-surface border border-gold/20 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-lg mb-2 text-[#111]">What It Measures</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Exchange-traded turnover in bond funds: a proxy for activity, not
            dealer depth or TRACE prints.
          </p>
        </div>
        <div className="bg-surface border border-gold/20 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-lg mb-2 text-[#111]">Latest Session</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Figures come from the latest session&apos;s quotes; Refresh reloads
            them.
          </p>
        </div>
      </div>

      {/* Chart Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-[#111]">
          Treasury ETF Turnover by Maturity
        </h2>
        <button
          onClick={fetchLiquidityData}
          className="bg-[#f9d949] hover:bg-[#f7c948] px-4 py-2 rounded-xl flex items-center gap-2 font-semibold transition"
        >
          <RefreshCcw className="w-4 h-4" /> Refresh
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Dealer axes and TRACE data are not available from our market-data
        provider. Shown: the day&apos;s dollar volume (price × shares traded) in
        the Treasury ETF at each maturity bucket
        {data.length > 0 && ` (${data.map((d) => d.symbol).join(", ")})`} — a
        turnover proxy, not dealer depth.
      </p>

      {/* Chart */}
      <div className="bg-surface border border-gold/20 rounded-2xl p-6 shadow-md">
        {loading ? (
          <p className="text-center text-gray-500">Loading liquidity data...</p>
        ) : data.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorLiq" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f9d949" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#f9d949" stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f2eecb" />
              <XAxis dataKey="bucket" tick={{ fill: "#555" }} />
              <YAxis
                label={{
                  value: "Dollar volume ($M)",
                  angle: -90,
                  position: "insideLeft",
                  fill: "#444",
                }}
                tick={{ fill: "#555" }}
              />
              <Tooltip
                formatter={(value) => [`$${value}M`, "Dollar volume"]}
                contentStyle={{
                  background: "#161410",
                  borderRadius: "10px",
                  border: "1px solid #f9d949",
                }}
              />
              <Area
                type="monotone"
                dataKey="turnover"
                stroke="#f9d949"
                fillOpacity={1}
                fill="url(#colorLiq)"
                strokeWidth={3}
                activeDot={{ r: 6, fill: "#f7c948" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-gray-500">
            No liquidity data available.
          </p>
        )}
      </div>
    </main>
  );
}
