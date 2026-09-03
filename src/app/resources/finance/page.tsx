import React from "react";
import Link from "next/link";
import CommandLine from "@/components/ui/CommandLine";
import Reveal from "@/components/ui/Reveal";

const GUIDES = [
  {
    title: "Understanding risk and return",
    href: "/resources/finance/risk-return",
    description:
      "Systematic and unsystematic risk, standard deviation as a measure of volatility, and the tradeoff behind every allocation.",
    cta: "Open guide",
  },
  {
    title: "Valuation models: DCF, multiples, and intrinsic value",
    href: "/resources/finance/valuation",
    description:
      "How analysts estimate what a business is worth: projected cash flows, comparable ratios, and intrinsic value.",
    cta: "Open guide",
  },
  {
    title: "Market psychology and behavioral finance",
    href: "/resources/finance/behavioral",
    description:
      "Overconfidence, herding, and loss aversion: how bias moves markets and how to keep it out of your decisions.",
    cta: "Open guide",
  },
  {
    title: "AI-powered ticker analysis",
    href: "/resources/finance/portfolio",
    description:
      "Enter a symbol for the live quote, day range, and an AI-style intrinsic value estimate with a sentiment read.",
    cta: "Open tool",
  },
];

export default function FinancePage() {
  return (
    <main className="min-h-screen bg-night text-ivory">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-14 md:py-20">
        <Reveal>
          <CommandLine cmd="FIN" note="finance guides" className="mb-4" />
          <h1 className="font-display text-ivory text-4xl md:text-6xl tracking-tight max-w-3xl">
            Finance
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-gray-400 leading-relaxed">
            Investment strategy, valuation models, and the psychology that gets in the way.
            Four guides, each readable in one sitting.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2">
          {GUIDES.map((g, i) => (
            <Reveal key={g.href} delay={i * 0.06} className="h-full">
              <Link href={g.href} className="card-night card-hover group flex h-full flex-col p-6">
                <span className="font-monodata text-[11px] uppercase tracking-widest text-gray-500">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h2 className="mt-4 text-lg md:text-xl font-semibold text-ivory">{g.title}</h2>
                <p className="mt-2 flex-1 text-gray-400 leading-relaxed">{g.description}</p>
                <span className="mt-6 font-monodata text-[11px] uppercase tracking-widest text-gold-soft">
                  {g.cta} <span className="arrow">→</span>
                </span>
              </Link>
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
