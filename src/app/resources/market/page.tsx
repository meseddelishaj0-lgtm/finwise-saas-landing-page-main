import React from "react";
import Link from "next/link";
import CommandLine from "@/components/ui/CommandLine";
import Reveal from "@/components/ui/Reveal";

const LEVELS = [
  {
    label: "Beginner",
    title: "Understanding the stock market",
    points: [
      "What are stocks, ETFs, and indices?",
      "How stock prices move and why",
      "Major indices: S&P 500, Nasdaq, Dow Jones",
    ],
  },
  {
    label: "Intermediate",
    title: "Market analysis techniques",
    points: [
      "Fundamental vs technical analysis",
      "Economic indicators (CPI, GDP, yield curve)",
      "Market sentiment and volume analysis",
    ],
  },
  {
    label: "Advanced",
    title: "Advanced trading and macro insights",
    points: [
      "Options, futures, and hedging strategies",
      "Quantitative trading models",
      "Monetary policy and global capital flows",
    ],
  },
];

function PointList({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 space-y-1.5 text-sm text-gray-400">
      {items.map((it) => (
        <li key={it} className="flex gap-2.5">
          <span className="font-monodata font-semibold text-gold" aria-hidden="true">
            +
          </span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

export default function MarketPage() {
  return (
    <main className="min-h-screen bg-night text-ivory">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-14 md:py-20">
        <Reveal>
          <CommandLine cmd="MKT" note="market guides" className="mb-4" />
          <h1 className="font-display text-ivory text-4xl md:text-6xl tracking-tight max-w-3xl">
            Market
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-gray-400 leading-relaxed">
            Stock markets, indices, and global economic trends: how to read market cycles,
            interpret the data, and make decisions grounded in it.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {LEVELS.map((level, i) => (
            <Reveal key={level.title} delay={i * 0.06} className="h-full">
              <article className="card-night h-full p-6">
                <p className="font-monodata text-[11px] uppercase tracking-widest text-gray-500">
                  {String(i + 1).padStart(2, "0")} · {level.label}
                </p>
                <h2 className="mt-4 text-lg md:text-xl font-semibold text-ivory">{level.title}</h2>
                <PointList items={level.points} />
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-14">
          <div className="flex flex-wrap gap-3">
            <Link href="/terminal" className="btn-gold px-5 py-2.5 text-sm">
              Open the terminal
            </Link>
            <Link href="/resources" className="btn-ghost-gold px-5 py-2.5 text-sm">
              ← Back to library
            </Link>
          </div>
        </Reveal>
      </div>
    </main>
  );
}
