"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { ArrowLeft, RefreshCcw } from "lucide-react";
import Link from "next/link";

// U.S. Treasury par-yield curve (1M–30Y), from /api/bonds. Rows arrive newest
// first; the latest curve is drawn against the one about a month earlier.

type Row = Record<string, number | string | null>;

const MATURITIES: { key: string; label: string }[] = [
  { key: "month1", label: "1M" },
  { key: "month2", label: "2M" },
  { key: "month3", label: "3M" },
  { key: "month6", label: "6M" },
  { key: "year1", label: "1Y" },
  { key: "year2", label: "2Y" },
  { key: "year3", label: "3Y" },
  { key: "year5", label: "5Y" },
  { key: "year7", label: "7Y" },
  { key: "year10", label: "10Y" },
  { key: "year20", label: "20Y" },
  { key: "year30", label: "30Y" },
];

/** About a month of trading days back. */
const COMPARE_BACK = 21;

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

export default function YieldCurveVisualizer() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCurve = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/bonds");
      if (!res.ok) throw new Error("Request failed");
      const json = await res.json();
      const rates: Row[] = Array.isArray(json?.treasuryRates) ? json.treasuryRates : [];
      if (rates.length === 0) throw new Error("No yields returned");
      setRows(rates);
    } catch (err) {
      console.error("Error fetching Treasury yields:", err);
      setError("Treasury yields are unavailable right now.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurve();
  }, []);

  const latest = rows[0];
  const earlier = rows[Math.min(COMPARE_BACK, rows.length - 1)];
  const hasEarlier = Boolean(earlier && earlier !== latest);

  const curve = latest
    ? MATURITIES.map((m) => ({
        maturity: m.label,
        latest: num(latest[m.key]),
        earlier: hasEarlier ? num(earlier[m.key]) : null,
      })).filter((p) => p.latest !== null)
    : [];

  const y2 = num(latest?.year2);
  const y10 = num(latest?.year10);
  const slope = y2 !== null && y10 !== null ? y10 - y2 : null;

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
          Yield Curve Visualizer
        </h1>
        <p className="text-lg text-gray-400 mt-3">
          The U.S. Treasury par-yield curve, today against a month ago.
        </p>
      </div>

      {/* Feature Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-10">
        <div className="bg-surface border border-gold/20 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-lg mb-2 text-[#111]">Slope</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            The gap between short- and long-term yields — a read on growth
            expectations.
            {slope !== null && (
              <span className="block mt-2 font-mono text-gray-200">
                10Y – 2Y: {slope >= 0 ? "+" : ""}
                {slope.toFixed(2)} pts
              </span>
            )}
          </p>
        </div>
        <div className="bg-surface border border-gold/20 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-lg mb-2 text-[#111]">Butterfly</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Curvature: how mid-term yields sit relative to the short and long
            ends.
          </p>
        </div>
        <div className="bg-surface border border-gold/20 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-lg mb-2 text-[#111]">Shift</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Compare today&apos;s curve with a month ago to see whether rates moved
            in parallel or twisted.
          </p>
        </div>
      </div>

      {/* Chart Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-[#111]">U.S. Treasury Yield Curve</h2>
        <button
          onClick={fetchCurve}
          className="bg-[#f9d949] hover:bg-[#f7c948] px-4 py-2 rounded-xl flex items-center gap-2 font-semibold transition"
        >
          <RefreshCcw className="w-4 h-4" /> Refresh
        </button>
      </div>
      {latest && (
        <p className="text-sm text-gray-500 mb-4">
          Par yields in percent as of {String(latest.date)}
          {hasEarlier && `, against ${String(earlier.date)}`}.
        </p>
      )}

      {/* Chart */}
      <div className="bg-surface border border-gold/20 rounded-2xl p-6 shadow-md">
        {loading ? (
          <p className="text-center text-gray-500 py-8">Loading yield curve...</p>
        ) : error ? (
          <p className="text-center text-gray-500 py-8">{error}</p>
        ) : curve.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={curve} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a261d" />
              <XAxis dataKey="maturity" tick={{ fill: "#9ca3af" }} />
              <YAxis
                domain={["auto", "auto"]}
                tickFormatter={(v: number) => `${v.toFixed(1)}%`}
                tick={{ fill: "#9ca3af" }}
              />
              <Tooltip
                formatter={(value: number) => `${value.toFixed(2)}%`}
                contentStyle={{
                  background: "#161410",
                  borderRadius: "10px",
                  border: "1px solid #f9d949",
                }}
              />
              <Legend />
              {hasEarlier && (
                <Line
                  type="monotone"
                  dataKey="earlier"
                  name={`${String(earlier.date)}`}
                  stroke="#6b7280"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
              )}
              <Line
                type="monotone"
                dataKey="latest"
                name={`${String(latest?.date)}`}
                stroke="#f9d949"
                strokeWidth={3}
                dot={{ r: 3, fill: "#f9d949" }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-gray-500 py-8">No yield data available.</p>
        )}
      </div>
    </main>
  );
}
