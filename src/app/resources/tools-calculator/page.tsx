import React from "react";
import Link from "next/link";
import { Calculator, TrendingUp, Home, DollarSign, BarChart3, PiggyBank } from "lucide-react";
import CommandLine from "@/components/ui/CommandLine";
import Reveal from "@/components/ui/Reveal";

const TOOLS = [
  {
    title: "ROI calculator",
    icon: TrendingUp,
    description:
      "Return on investment from total gain and total cost, so you can compare projects on one number.",
    href: "/resources/tools-calculator/roi-calculator",
  },
  {
    title: "Mortgage calculator",
    icon: Home,
    description:
      "Estimated monthly principal-and-interest payment from loan amount, rate, and term.",
    href: "/resources/tools-calculator/mortgage-calculator",
  },
  {
    title: "Loan calculator",
    icon: DollarSign,
    description:
      "Monthly payment, total repaid, and total interest across any loan term.",
    href: "/resources/tools-calculator/loan-calculator",
  },
  {
    title: "Compound interest calculator",
    icon: PiggyBank,
    description:
      "Future balance and interest earned at any compounding frequency, with a year-by-year growth chart.",
    href: "/resources/tools-calculator/compound-interest",
  },
  {
    title: "Tax estimator",
    icon: BarChart3,
    description:
      "Federal, state, and FICA taxes with standard or itemized deductions and the child tax credit.",
    href: "/resources/tools-calculator/tax-estimator",
  },
];

export default function ToolsCalculatorsPage() {
  return (
    <main className="min-h-screen bg-night text-ivory">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-14 md:py-20">
        <Reveal>
          <CommandLine cmd="CAL" note="tools and calculators" className="mb-4" />
          <h1 className="font-display text-ivory text-4xl md:text-6xl tracking-tight max-w-3xl">
            Tools &amp; <em className="italic text-gold-soft">calculators</em>.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-gray-400 leading-relaxed">
            Five calculators for the numbers that come up most: returns, mortgages, loans,
            compounding, and taxes. Enter your figures and the result updates in place.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool, i) => {
            const Icon = tool.icon;
            return (
              <Reveal key={tool.href} delay={i * 0.06} className="h-full">
                <Link href={tool.href} className="card-night card-hover group flex h-full flex-col p-6">
                  <Icon className="h-6 w-6 text-gold" aria-hidden="true" />
                  <h2 className="mt-5 text-lg md:text-xl font-semibold text-ivory">{tool.title}</h2>
                  <p className="mt-2 flex-1 text-gray-400 leading-relaxed">{tool.description}</p>
                  <span className="mt-6 font-monodata text-[11px] uppercase tracking-widest text-gold-soft">
                    Open calculator <span className="arrow">→</span>
                  </span>
                </Link>
              </Reveal>
            );
          })}
          <Reveal delay={TOOLS.length * 0.06} className="h-full">
            <div className="card-night flex h-full flex-col justify-between border-dashed p-6">
              <Calculator className="h-6 w-6 text-gray-500" aria-hidden="true" />
              <p className="mt-5 text-sm text-gray-500 leading-relaxed">
                Every calculator runs in your browser. Nothing you type is sent to a server or
                stored.
              </p>
            </div>
          </Reveal>
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
