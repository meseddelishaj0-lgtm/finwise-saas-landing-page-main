"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

interface PlatformComparison {
  name: string;
  features: string[];
  pricing: string;
  bestFor: string;
  pros: string;
  cons: string;
}

export default function CompareResearchPlatformsPage() {
  const [platforms, setPlatforms] = useState<PlatformComparison[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPlatforms = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/compare-research-platforms");
      const data = await res.json();
      if (Array.isArray(data)) {
        setPlatforms(data);
      } else {
        console.error("Invalid comparison data:", data);
      }
    } catch (err) {
      console.error("Fetch platforms error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlatforms();
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
          Compare Research Platforms
        </h1>
        <p className="text-lg text-gray-600">
          Evaluate different research & analytics platforms side-by-side to find the best fit for your investing or advisory workflow.
        </p>
      </motion.section>

      {/* Loading or Platforms List */}
      <div className="w-full max-w-6xl space-y-8 mb-16">
        {loading ? (
          <p className="text-center text-gray-500">Loading comparisons…</p>
        ) : platforms.length === 0 ? (
          <p className="text-center text-gray-500">No platforms available at this time.</p>
        ) : (
          platforms.map((p, idx) => (
            <motion.div
              key={idx}
              whileHover={{ scale: 1.02 }}
              className="bg-gray-50 border border-gray-200 rounded-2xl shadow-md p-6"
            >
              <h3 className="text-2xl font-semibold mb-2 text-gray-800">{p.name}</h3>
              <p className="text-sm text-gray-500 mb-4">Pricing: {p.pricing}</p>
              <p className="text-gray-700 mb-3"><strong>Best for:</strong> {p.bestFor}</p>
              <div className="mb-3"><strong>Key Features:</strong></div>
              <ul className="list-disc list-inside text-gray-700 mb-3">
                {p.features.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
              <div className="mb-2"><strong>Pros:</strong> {p.pros}</div>
              <div className="mb-2"><strong>Cons:</strong> {p.cons}</div>
              <Link
                href="/register"
                className="inline-block mt-4 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-5 py-3 rounded-xl transition-all"
              >
                Get Started
              </Link>
            </motion.div>
          ))
        )}
      </div>

      {/* CTA Section */}
      <div className="text-center">
        <h3 className="text-2xl font-semibold mb-3 text-gray-900">
          Ready to Gain an Edge?
        </h3>
        <p className="text-gray-600 mb-6">
          Join WallStreetStocks to access exclusive comparisons, expert reviews, and AI-driven research tools tailored for serious investors.
        </p>
        <Link
          href="/register"
          className="inline-block bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-6 py-3 rounded-xl transition-all"
        >
          Join Now
        </Link>
      </div>
    </main>
  );
}
