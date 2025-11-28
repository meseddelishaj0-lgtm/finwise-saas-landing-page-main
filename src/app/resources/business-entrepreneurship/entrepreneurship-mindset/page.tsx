"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

interface ModuleItem {
  id: string;
  title: string;
  description: string;
  link: string;
}

export default function EntrepreneurshipMindsetPage() {
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchModules = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/entrepreneurship-mindset");
      const data = await res.json();
      if (Array.isArray(data)) {
        setModules(data);
      } else {
        console.error("Invalid modules response:", data);
      }
    } catch (err) {
      console.error("Fetch modules error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
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
          Entrepreneurship Mindset
        </h1>
        <p className="text-lg text-gray-600">
          Cultivate the mindset of an entrepreneur — from resilience and creativity to self-leadership and growth tracking.
        </p>
      </motion.section>

      {/* Modules List */}
      <div className="w-full max-w-5xl grid gap-8 mb-16">
        {loading ? (
          <p className="text-center text-gray-500">Loading modules…</p>
        ) : modules.length === 0 ? (
          <p className="text-center text-gray-500">No modules available currently.</p>
        ) : (
          modules.map((m) => (
            <motion.div
              key={m.id}
              whileHover={{ scale: 1.02 }}
              className="bg-gray-50 border border-gray-200 rounded-2xl shadow-md p-6"
            >
              <h3 className="text-2xl font-semibold mb-2 text-gray-800">
                {m.title}
              </h3>
              <p className="text-gray-700 mb-4">{m.description}</p>
              <Link
                href={m.link}
                className="inline-block bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-5 py-3 rounded-xl transition-all"
              >
                Explore Module
              </Link>
            </motion.div>
          ))
        )}
      </div>

      {/* CTA Section */}
      <div className="text-center">
        <h3 className="text-2xl font-semibold mb-3 text-gray-900">
          Ready to Transform Your Mindset?
        </h3>
        <p className="text-gray-600 mb-6">
          Join the WallStreetStocks entrepreneurship community for mindset hot-seats, peer coaching and frameworks that fuel growth.
        </p>
        <Link
          href="/register"
          className="inline-block bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-6 py-3 rounded-xl transition-all"
        >
          Join the Community
        </Link>
      </div>
    </main>
  );
}
