import React from "react";
import Link from "next/link";
import CommandLine from "@/components/ui/CommandLine";
import Reveal from "@/components/ui/Reveal";

type Topic = { title: string; body: string; points: string[] };

const LEVELS: { label: string; topics: Topic[] }[] = [
  {
    label: "Beginner",
    topics: [
      {
        title: "Introduction to real estate",
        body:
          "Get familiar with the basics of real estate: how properties are bought, sold, and valued. Understand the key players and what drives the market.",
        points: [
          "Types of real estate (residential, commercial, industrial, land)",
          "How property values are determined",
          "Role of agents, brokers, and appraisers",
        ],
      },
      {
        title: "Real estate as an investment",
        body:
          "Learn how real estate generates wealth through appreciation, rental income, and tax advantages.",
        points: ["Cash flow and appreciation", "Active vs passive investing", "REITs and real estate funds"],
      },
    ],
  },
  {
    label: "Intermediate",
    topics: [
      {
        title: "Real estate finance and valuation",
        body:
          "Dive deeper into the valuation and financial analysis methods investors use to determine what a property is worth.",
        points: [
          "Net operating income (NOI) and cap rate",
          "Discounted cash flow (DCF) valuation",
          "Gross rent multiplier (GRM) and the sales comparison approach",
        ],
      },
      {
        title: "Real estate contracts and law",
        body:
          "Understand the legal framework of real estate transactions, from purchase agreements to deeds and title insurance.",
        points: ["Listing and purchase agreements", "Deeds, liens, and easements", "Title reports and escrow"],
      },
    ],
  },
  {
    label: "Advanced",
    topics: [
      {
        title: "Commercial real estate analysis",
        body:
          "Explore the advanced metrics and deal structures used in commercial real estate, from development projects to portfolio investing.",
        points: [
          "Loan-to-value (LTV) and debt service coverage ratio (DSCR)",
          "IRR and equity multiple calculations",
          "Lease analysis and tenant risk",
        ],
      },
      {
        title: "Real estate market analysis",
        body:
          "Learn how to evaluate neighborhoods, demand cycles, and the economic indicators that influence real estate prices.",
        points: [
          "Absorption rates and vacancy trends",
          "Comparative market analysis (CMA)",
          "Regional economic drivers and population growth",
        ],
      },
    ],
  },
];

const FURTHER = [
  {
    title: "Recommended books",
    items: [
      "Rich Dad Poor Dad by Robert Kiyosaki",
      "The Millionaire Real Estate Investor by Gary Keller",
      "Real Estate Finance and Investments by Brueggeman and Fisher",
    ],
  },
  {
    title: "Online courses",
    items: [
      "Coursera: Real Estate Investment and Development",
      "edX: Commercial Real Estate Analysis (MITx)",
      "Udemy: Real Estate Financial Modeling Bootcamp",
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

export default function RealEstatePage() {
  return (
    <main className="min-h-screen bg-night text-ivory">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-14 md:py-20">
        <Reveal>
          <CommandLine cmd="RES" note="real estate guides" className="mb-4" />
          <h1 className="font-display text-ivory text-4xl md:text-6xl tracking-tight max-w-3xl">
            Real estate
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-gray-400 leading-relaxed">
            The fundamentals of property investing, valuation, and financing. Residential,
            commercial, and investment real estate, arranged from first principles to deal
            analysis.
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
                    <p className="mt-2 text-gray-400 leading-relaxed">{t.body}</p>
                    <PointList items={t.points} />
                  </article>
                </Reveal>
              ))}
            </div>
          </section>
        ))}

        <Reveal className="mt-20">
          <h2 className="font-display text-ivory text-3xl md:text-5xl tracking-tight">
            Continue learning
          </h2>
          <p className="mt-4 max-w-2xl text-gray-400 leading-relaxed">
            Books and courses that go deeper on real estate investing.
          </p>
        </Reveal>
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          {FURTHER.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.06} className="h-full">
              <div className="card-night h-full p-6">
                <h3 className="text-lg md:text-xl font-semibold text-ivory">{f.title}</h3>
                <PointList items={f.items} />
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-14">
          <Link href="/resources" className="btn-ghost-gold px-5 py-2.5 text-sm">
            ← Back to library
          </Link>
        </Reveal>
      </div>
    </main>
  );
}
