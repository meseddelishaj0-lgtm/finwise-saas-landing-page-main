"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

interface Report {
  headline: string;
  source: string;
  summary: string;
  url: string;
}

export default function WeeklyResearchReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await fetch("/api/finnhub/news");
        const data = await res.json();
        setReports(data.slice(0, 6)); // top 6 reports
      } catch (error) {
        console.error("Error fetching research reports:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-amber-100 to-yellow-50 py-16 px-6 text-gray-900">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-5xl mx-auto text-center"
      >
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-yellow-500 via-amber-600 to-yellow-700 bg-clip-text text-transparent">
          Weekly Research Reports
        </h1>
        <p className="mt-4 text-lg text-gray-700">
          The latest insights, analysis, and institutional-grade reports powered by Finnhub and AI summarization.
        </p>
      </motion.div>

      {loading ? (
        <div className="flex justify-center mt-16 text-amber-600 font-semibold animate-pulse">
          Loading reports...
        </div>
      ) : (
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
          {reports.map((r, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-2xl shadow-lg p-6 border border-amber-100 hover:shadow-xl transition-all"
            >
              <h2 className="text-xl font-semibold text-gray-900">{r.headline}</h2>
              <p className="text-sm text-gray-500 mt-1">{r.source}</p>
              <p className="mt-3 text-gray-700">{r.summary}</p>
              <a href={r.url} target="_blank" rel="noreferrer" className="text-amber-600 font-medium mt-3 inline-block hover:underline">
                Read Full Report →
              </a>
            </motion.div>
          ))}
        </div>
      )}

      <div className="mt-16 flex flex-col sm:flex-row justify-center gap-4">
        <Link href="/pricing" className="px-6 py-3 rounded-full text-white font-semibold bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 hover:opacity-90 transition-all">
          Back to Gold Plan
        </Link>
      </div>
    </div>
  );
}
