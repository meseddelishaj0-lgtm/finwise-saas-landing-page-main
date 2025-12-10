'use client';

import React from 'react';
import Link from 'next/link';
import {
  Star,
  BookOpen,
  BarChart3,
  Users,
  Brain,
  Trophy,
} from 'lucide-react';

export default function GoldDashboardPage() {
  return (
    <section className="max-w-6xl mx-auto pt-28 py-16 px-6">
      {/* Header */}
      <div className="text-center mb-12">
        <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          🥇 Gold Plan Dashboard
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Perfect for beginners starting their <strong>AI investing journey</strong>.  
          Access smart AI tools, curated insights, and community learning — all in one place.
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* AI Stock Picks */}
        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 hover:shadow-lg transition">
          <Brain className="w-8 h-8 text-yellow-500 mb-3" />
          <h2 className="text-xl font-semibold mb-2">AI Stock Picks</h2>
          <p className="text-gray-600 mb-4">
            Get weekly AI-generated stock recommendations based on sentiment, fundamentals, and trends.
          </p>
          <Link
            href="/dashboard/gold/ai-stock-picks"
            className="text-yellow-600 hover:underline font-semibold"
          >
            View Picks →
          </Link>
        </div>

        {/* Weekly Research Reports */}
        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 hover:shadow-lg transition">
          <BookOpen className="w-8 h-8 text-yellow-500 mb-3" />
          <h2 className="text-xl font-semibold mb-2">Weekly Research Reports</h2>
          <p className="text-gray-600 mb-4">
            Access premium weekly AI research covering earnings, market trends, and economic updates.
          </p>
          <Link
            href="/dashboard/gold/weekly-research-reports"
            className="text-yellow-600 hover:underline font-semibold"
          >
            Read Reports →
          </Link>
        </div>

        {/* Fundamental AI Ratings */}
        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 hover:shadow-lg transition">
          <BarChart3 className="w-8 h-8 text-yellow-500 mb-3" />
          <h2 className="text-xl font-semibold mb-2">Fundamental AI Ratings</h2>
          <p className="text-gray-600 mb-4">
            See every stock’s AI-driven score for value, growth, and risk using real financial data.
          </p>
          <Link
            href="/dashboard/gold/fundamental-ai-ratings"
            className="text-yellow-600 hover:underline font-semibold"
          >
            Analyze Stocks →
          </Link>
        </div>

        {/* Beginner Portfolio Templates */}
        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 hover:shadow-lg transition">
          <Star className="w-8 h-8 text-yellow-500 mb-3" />
          <h2 className="text-xl font-semibold mb-2">Beginner Portfolio Templates</h2>
          <p className="text-gray-600 mb-4">
            Start fast with ready-to-use AI-optimized portfolios for different risk levels.
          </p>
          <Link
            href="/dashboard/gold/beginner-portfolio-templates"
            className="text-yellow-600 hover:underline font-semibold"
          >
            Browse Templates →
          </Link>
        </div>

        {/* Community Access */}
        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 hover:shadow-lg transition">
          <Users className="w-8 h-8 text-yellow-500 mb-3" />
          <h2 className="text-xl font-semibold mb-2">Community Access</h2>
          <p className="text-gray-600 mb-4">
            Join discussions, share insights, and connect with other investors in our AI community.
          </p>
          <Link
            href="/community"
            className="text-yellow-600 hover:underline font-semibold"
          >
            Join Community →
          </Link>
        </div>

        {/* Upgrade CTA */}
        <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-2xl p-6 text-center shadow text-black">
          <h2 className="text-2xl font-bold mb-2">Go Platinum 🚀</h2>
          <p className="text-sm mb-4">
            Unlock backtesting, hedge fund-grade analytics, and real-time trade signals.
          </p>
          <Link
            href="/plans"
            className="inline-block bg-black text-yellow-400 font-semibold px-5 py-2 rounded-lg hover:bg-gray-900 transition"
          >
            Upgrade Now →
          </Link>
        </div>
      </div>

      {/* Footer Link */}
      <div className="mt-12 text-center">
        <Link href="/" className="text-gray-500 hover:text-yellow-500 text-sm">
          ← Back to Home
        </Link>
      </div>
    </section>
  );
}
