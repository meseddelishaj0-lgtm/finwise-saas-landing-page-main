import React from "react";
import Link from "next/link";
import CommandLine from "@/components/ui/CommandLine";
import Reveal from "@/components/ui/Reveal";

type Topic = { title: string; body?: string; points?: string[] };

const LEVELS: { label: string; topics: Topic[] }[] = [
  {
    label: "Beginner",
    topics: [
      {
        title: "What is insurance?",
        body:
          "Insurance is a contract that transfers financial risk from an individual or business to an insurer.",
        points: [
          "Life, health, property, and liability insurance",
          "Premiums, deductibles, and coverage limits",
          "Purpose: risk management and asset protection",
        ],
      },
      {
        title: "Why insurance matters",
        body:
          "Insurance provides financial security and ensures continuity in case of unforeseen events, which makes it essential to financial planning.",
      },
    ],
  },
  {
    label: "Intermediate",
    topics: [
      {
        title: "Property and casualty insurance",
        body:
          "Covers losses from damage or liability, such as car, homeowners, or business insurance.",
        points: [
          "Homeowners and auto coverage",
          "Business interruption insurance",
          "Professional liability (E&O)",
        ],
      },
      {
        title: "Life and health insurance",
        body:
          "Term vs. whole life insurance, health plan structures (HMO/PPO), and employer-provided benefits.",
      },
    ],
  },
  {
    label: "Advanced",
    topics: [
      {
        title: "Advanced insurance strategies",
        points: [
          "Key person insurance for businesses",
          "Captive insurance companies",
          "Using insurance in estate planning",
        ],
      },
      {
        title: "Insurance in wealth management",
        body:
          "How high-net-worth individuals use permanent life insurance for tax-advantaged growth and wealth transfer.",
      },
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

export default function InsurancePage() {
  return (
    <main className="min-h-screen bg-night text-ivory">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-14 md:py-20">
        <Reveal>
          <CommandLine cmd="INS" note="insurance guides" className="mb-4" />
          <h1 className="font-display text-ivory text-4xl md:text-6xl tracking-tight max-w-3xl">
            Insurance
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-gray-400 leading-relaxed">
            How insurance protects wealth, manages risk, and fits into personal and business
            finance. Life, health, property, and liability coverage, from fundamentals to
            advanced strategies.
          </p>
        </Reveal>

        {LEVELS.map((level, li) => (
          <section key={level.label} className="mt-14">
            <Reveal>
              <p className="font-monodata text-[11px] uppercase tracking-widest text-gray-500">
                {String(li + 1).padStart(2, "0")} · {level.label}
              </p>
            </Reveal>
            <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
              {level.topics.map((t, i) => (
                <Reveal key={t.title} delay={i * 0.06} className="h-full">
                  <article className="card-night h-full p-6">
                    <h2 className="text-lg md:text-xl font-semibold text-ivory">{t.title}</h2>
                    {t.body && <p className="mt-2 text-gray-400 leading-relaxed">{t.body}</p>}
                    {t.points && <PointList items={t.points} />}
                  </article>
                </Reveal>
              ))}
            </div>
          </section>
        ))}

        <Reveal className="mt-14">
          <Link href="/resources" className="btn-ghost-gold px-5 py-2.5 text-sm">
            ← Back to library
          </Link>
        </Reveal>
      </div>
    </main>
  );
}
