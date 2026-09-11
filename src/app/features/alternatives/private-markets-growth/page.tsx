"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
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
  Cell,
} from "recharts";
import { useRouter } from "next/navigation";

// Fund-level private-markets marks (TVPI, IRR, capital calls) are not public
// market data, so nothing here claims to be one. Both panels show the day's
// move in the listed vehicles that track the asset class, served by
// /api/alternatives: listed PE managers plus a listed PE fund index, and
// liquid funds that replicate hedge-fund strategies.

interface ProxyRow {
  name: string; // ticker
  fullName: string;
  change: number;
}

const toRows = (json: any): ProxyRow[] =>
  (Array.isArray(json?.data) ? json.data : [])
    .filter((q: any) => typeof q.changesPercentage === "number")
    .map((q: any) => ({
      name: q.symbol,
      fullName: q.name,
      change: Number(q.changesPercentage.toFixed(2)),
    }));

const fetchBoard = (type: string) =>
  fetch("/api/alternatives", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type }),
  })
    .then((r) => r.json())
    .catch(() => null);

export default function PrivateMarketsGrowthPage() {
  const router = useRouter();

  const [peData, setPeData] = useState<ProxyRow[]>([]);
  const [hfData, setHfData] = useState<ProxyRow[]>([]);
  const [peNote, setPeNote] = useState("");
  const [hfNote, setHfNote] = useState("");
  const [aiSummary, setAiSummary] = useState("");
  const [loading, setLoading] = useState(true);

  // Fetch listed-proxy quotes + AI insight
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pe, hf] = await Promise.all([
          fetchBoard("private_equity"),
          fetchBoard("hedge_funds"),
        ]);
        const peRows = toRows(pe);
        const hfRows = toRows(hf);
        setPeData(peRows);
        setHfData(hfRows);
        setPeNote(pe?.note || "");
        setHfNote(hf?.note || "");

        const moves = (rows: ProxyRow[]) =>
          rows
            .map((r) => `${r.name} ${r.change > 0 ? "+" : ""}${r.change}%`)
            .join(", ") || "unavailable";

        // Prompt AI to summarize trends from the real proxy moves
        const prompt = `
        Provide a concise institutional-style market commentary (120 words max)
        on private-markets sentiment, based only on today's moves in these listed proxies.
        Listed private-equity managers and PE fund index: ${moves(peRows)}.
        Liquid funds replicating hedge-fund strategies: ${moves(hfRows)}.
        Do not state TVPI, IRR, or capital-call figures; fund-level marks are not available.
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

  const renderBoard = (rows: ProxyRow[]) =>
    rows.length > 0 ? (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={rows}>
          <XAxis dataKey="name" />
          <YAxis unit="%" />
          <Tooltip formatter={(value) => [`${value}%`, "Daily change"]} />
          <Bar dataKey="change" fill="#facc15" radius={[8, 8, 0, 0]}>
            {rows.map((_, i) => (
              <Cell key={i} fill="#fbbf24" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    ) : (
      <p className="text-gray-500 text-sm">
        {loading ? "Loading…" : "Data unavailable right now."}
      </p>
    );

  return (
    <div className="min-h-screen bg-night text-ivory py-14 px-6 md:px-16">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-7xl mx-auto bg-surface rounded-3xl shadow-lg border border-white/10 p-10"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-8 flex-wrap gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center text-sm text-gray-500 hover:text-gray-300"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Features
          </button>

          <div className="flex items-center gap-2">
            <TrendingUp className="text-gold" />
            <h1 className="text-3xl font-display font-normal tracking-tight md:text-4xl">Private Markets Growth</h1>
          </div>
        </div>

        <p className="text-gray-400 mb-10">
          Private-markets sentiment read through the listed vehicles that track
          it. Fund-level marks such as TVPI and IRR are not public data and are
          not shown.
        </p>

        {/* Listed private equity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="bg-gold/10 p-6 rounded-2xl mb-10 border border-gold/20"
        >
          <div className="flex items-center mb-2">
            <BarChart3 className="h-5 w-5 text-gold mr-2" />
            <h2 className="text-lg font-semibold text-ivory">
              Listed Private Equity — Daily Move
            </h2>
          </div>
          {peNote && <p className="text-xs text-gray-400 mb-4">{peNote}</p>}
          {renderBoard(peData)}
        </motion.div>

        {/* Hedge-fund replicators */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="bg-gold/10 p-6 rounded-2xl mb-10 border border-gold/20"
        >
          <div className="flex items-center mb-2">
            <BarChart3 className="h-5 w-5 text-gold mr-2" />
            <h2 className="text-lg font-semibold text-ivory">
              Hedge-Fund Replicators — Daily Move
            </h2>
          </div>
          {hfNote && <p className="text-xs text-gray-400 mb-4">{hfNote}</p>}
          {renderBoard(hfData)}
        </motion.div>

        {/* AI Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="bg-gold/10 border border-gold/20 rounded-2xl p-6 mb-10"
        >
          <div className="flex items-center mb-2">
            <Sparkles className="h-5 w-5 text-gold mr-2" />
            <h2 className="text-lg font-semibold text-ivory">
              AI Market Insight
            </h2>
          </div>
          {loading ? (
            <p className="text-gray-500 text-sm">Loading insights...</p>
          ) : (
            <p className="text-gray-100 text-sm leading-relaxed whitespace-pre-line">
              {aiSummary}
            </p>
          )}
        </motion.div>

        {/* Footer CTA */}
        <div className="text-center">
          <button
            onClick={() => alert("Coming soon – Private Markets Analytics Pro")}
            className="bg-yellow-400 hover:bg-gold text-night font-semibold px-8 py-3 rounded-full transition"
          >
            Explore →
          </button>
        </div>
      </motion.div>
    </div>
  );
}
