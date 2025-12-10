"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

interface Report {
  id: string;
  title: string;
  date: string;
  url: string;
  summary: string;
}

export default function PerformanceReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/performance-reports");
      const data = await res.json();
      if (Array.isArray(data)) {
        setReports(data);
      } else {
        console.error("Invalid reports data:", data);
      }
    } catch (err) {
      console.error("Fetch reports error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

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
          Performance Reports
        </h1>
        <p className="text-lg text-gray-600">
          Download our latest quarterly and annual performance reports — full transparency on strategy returns, risk metrics and benchmark comparisons.
        </p>
      </motion.section>

      {/* Report List */}
      <div className="w-full max-w-5xl grid gap-6 mb-16">
        {loading ? (
          <p className="text-center text-gray-500">Loading reports…</p>
        ) : reports.length === 0 ? (
          <p className="text-center text-gray-500">No reports available at this time.</p>
        ) : (
          reports.map((r) => (
            <motion.div
              key={r.id}
              whileHover={{ scale: 1.02 }}
              className="bg-gray-50 border border-gray-200 rounded-2xl shadow-md p-6"
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-800">{r.title}</h3>
              <p className="text-sm text-gray-500 mb-4">Date: {r.date}</p>
              <p className="text-gray-700 mb-4">{r.summary}</p>
              <Link
                href={r.url}
                className="inline-block bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-5 py-3 rounded-xl transition-all"
                target="_blank"
              >
                Download Report
              </Link>
            </motion.div>
          ))
        )}
      </div>

      {/* Call to Action */}
      <div className="text-center">
        <h3 className="text-2xl font-semibold mb-3 text-gray-900">
          Want More In-Depth Analytics?
        </h3>
        <p className="text-gray-600 mb-6">
          Join WallStreetStocks Premium to gain access to monthly updates, full backtest archives, and live performance dashboards.
        </p>
        <Link
          href="/register"
          className="inline-block bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-6 py-3 rounded-xl transition-all"
        >
          Get Premium Access
        </Link>
      </div>
    </main>
  );
}
