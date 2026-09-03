import React from "react";
import Link from "next/link";
import CommandLine from "@/components/ui/CommandLine";
import Reveal from "@/components/ui/Reveal";

const CATEGORIES = [
  {
    title: "Finance",
    slug: "finance",
    description:
      "Risk and return, valuation models, behavioral finance, and a quick AI ticker check.",
  },
  {
    title: "Accounting",
    slug: "accounting",
    description:
      "Financial statements, GAAP vs IFRS, ratio analysis, and the basics of auditing and internal controls.",
  },
  {
    title: "Real estate",
    slug: "real-estate",
    description:
      "Property valuation, financing, contracts, and commercial analysis, from first purchase to portfolio.",
  },
  {
    title: "Insurance",
    slug: "insurance",
    description:
      "How coverage transfers risk: life, health, property and casualty, and insurance in wealth planning.",
  },
  {
    title: "Taxes",
    slug: "taxes",
    description:
      "Brackets and filing status, self-employment and business taxes, and planning strategies for investors.",
  },
  {
    title: "Market",
    slug: "market",
    description:
      "How stocks, ETFs, and indices work; fundamental and technical analysis; macro and derivatives.",
  },
  {
    title: "Tools & calculators",
    slug: "tools-calculator",
    description:
      "ROI, mortgage, loan, and compound-interest calculators plus a federal, state, and FICA tax estimator.",
  },
  {
    title: "Business & entrepreneurship",
    slug: "business-entrepreneurship",
    description:
      "Startup fundamentals, business planning, leadership, marketing, innovation, and the founder mindset.",
  },
];

export default function ResourcesPage() {
  return (
    <main className="min-h-screen bg-night text-ivory">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-14 md:py-20">
        <Reveal>
          <CommandLine cmd="LIB" note="the resources library" className="mb-4" />
          <h1 className="font-display text-ivory text-4xl md:text-6xl tracking-tight max-w-3xl">
            The reading <em className="italic text-gold-soft">room</em>.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-gray-400 leading-relaxed">
            Guides, references, and calculators across finance, accounting, real estate,
            insurance, taxes, markets, and business, written for investors who want the
            mechanics rather than the hype.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {CATEGORIES.map((cat, i) => (
            <Reveal key={cat.slug} delay={i * 0.06} className="h-full">
              <Link
                href={`/resources/${cat.slug}`}
                className="card-night card-hover group flex h-full flex-col p-6"
              >
                <span className="font-monodata text-[11px] uppercase tracking-widest text-gray-500">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h2 className="mt-4 text-lg md:text-xl font-semibold text-ivory">{cat.title}</h2>
                <p className="mt-2 flex-1 text-gray-400 leading-relaxed">{cat.description}</p>
                <span className="mt-6 font-monodata text-[11px] uppercase tracking-widest text-gold-soft">
                  Open <span className="arrow">→</span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </main>
  );
}
