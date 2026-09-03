import React from "react";
import Link from "next/link";
import CommandLine from "@/components/ui/CommandLine";
import Reveal from "@/components/ui/Reveal";

type Topic = { title: string; body?: string; points: string[] };

const LEVELS: { label: string; topics: Topic[] }[] = [
  {
    label: "Beginner",
    topics: [
      {
        title: "Introduction to taxes",
        points: [
          "Income vs payroll vs capital gains taxes",
          "Filing status and tax brackets",
          "How withholdings and deductions work",
        ],
      },
    ],
  },
  {
    label: "Intermediate",
    topics: [
      {
        title: "Business and self-employment taxes",
        body: "Tax obligations for freelancers, LLCs, and corporations.",
        points: [
          "Schedule C, 1099, and self-employment tax",
          "Corporate vs pass-through entities",
          "Estimated quarterly payments",
        ],
      },
    ],
  },
  {
    label: "Advanced",
    topics: [
      {
        title: "Tax planning strategies",
        points: [
          "Tax-loss harvesting for investors",
          "Deferred income and 1031 exchanges",
          "Retirement account optimization (IRA, 401k, Roth)",
        ],
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

export default function TaxesPage() {
  return (
    <main className="min-h-screen bg-night text-ivory">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-14 md:py-20">
        <Reveal>
          <CommandLine cmd="TAX" note="tax guides" className="mb-4" />
          <h1 className="font-display text-ivory text-4xl md:text-6xl tracking-tight max-w-3xl">
            Taxes
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-gray-400 leading-relaxed">
            How taxation affects income, investments, and businesses, and how to reduce what
            you owe legally through planning.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {LEVELS.map((level, li) =>
            level.topics.map((t) => (
              <Reveal key={t.title} delay={li * 0.06} className="h-full">
                <article className="card-night h-full p-6">
                  <p className="font-monodata text-[11px] uppercase tracking-widest text-gray-500">
                    {String(li + 1).padStart(2, "0")} · {level.label}
                  </p>
                  <h2 className="mt-4 text-lg md:text-xl font-semibold text-ivory">{t.title}</h2>
                  {t.body && <p className="mt-2 text-gray-400 leading-relaxed">{t.body}</p>}
                  <PointList items={t.points} />
                </article>
              </Reveal>
            ))
          )}
        </div>

        <Reveal className="mt-14">
          <div className="flex flex-wrap gap-3">
            <Link
              href="/resources/tools-calculator/tax-estimator"
              className="btn-gold px-5 py-2.5 text-sm"
            >
              Open the tax estimator
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
