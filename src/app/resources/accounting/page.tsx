import React from "react";
import Link from "next/link";
import CommandLine from "@/components/ui/CommandLine";
import Reveal from "@/components/ui/Reveal";

const TOPICS = [
  {
    title: "Financial statements explained",
    body:
      "Understand the structure and purpose of the three core financial statements: the balance sheet, income statement, and cash flow statement. Learn how they connect, how to read them, and how companies use them to communicate financial performance.",
    points: [
      "Balance sheet: assets, liabilities, and equity",
      "Income statement: revenue, expenses, and profitability",
      "Cash flow statement: operating, investing, and financing activities",
    ],
  },
  {
    title: "GAAP vs IFRS fundamentals",
    body:
      "Compare the two most widely used accounting frameworks, U.S. GAAP and IFRS. Discover their conceptual differences, recognition criteria, and presentation rules for assets, liabilities, and revenue.",
    points: [
      "U.S. GAAP: rules-based, standardized by FASB",
      "IFRS: principles-based, standardized by IASB",
      "Convergence trends between GAAP and IFRS",
    ],
  },
  {
    title: "Ratio analysis and interpretation",
    body:
      "Learn how to interpret financial health using key ratios from a company's statements. Ratio analysis turns raw data into actionable insight for valuation, performance, and risk assessment.",
    points: [
      "Liquidity ratios (current, quick)",
      "Profitability ratios (ROE, ROA, margin)",
      "Leverage ratios (debt-to-equity, interest coverage)",
    ],
  },
  {
    title: "Auditing and internal controls basics",
    body:
      "Auditing ensures the accuracy of financial statements and strengthens trust in corporate governance. Internal controls safeguard assets and prevent fraud.",
    points: [
      "Types of audits: internal, external, and forensic",
      "Key internal control components (COSO framework)",
      "Ethics, independence, and audit opinions",
    ],
  },
];

const FURTHER = [
  {
    title: "Recommended books",
    items: [
      "Financial Accounting by Weygandt, Kimmel, and Kieso",
      "Intermediate Accounting by Kieso and Warfield",
      "Auditing and Assurance Services by Arens and Elder",
    ],
  },
  {
    title: "Online courses",
    items: [
      "Coursera: Introduction to Financial Accounting (Wharton)",
      "edX: IFRS Certification Course",
      "LinkedIn Learning: Accounting Foundations",
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

export default function AccountingPage() {
  return (
    <main className="min-h-screen bg-night text-ivory">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-14 md:py-20">
        <Reveal>
          <CommandLine cmd="ACC" note="accounting reference" className="mb-4" />
          <h1 className="font-display text-ivory text-4xl md:text-6xl tracking-tight max-w-3xl">
            Accounting
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-gray-400 leading-relaxed">
            The language of business, from journal entries to financial statement analysis.
            Written from both a U.S. GAAP and IFRS perspective for analysts, investors, and
            business owners.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2">
          {TOPICS.map((t, i) => (
            <Reveal key={t.title} delay={i * 0.06} className="h-full">
              <article className="card-night h-full p-6">
                <span className="font-monodata text-[11px] uppercase tracking-widest text-gray-500">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h2 className="mt-4 text-lg md:text-xl font-semibold text-ivory">{t.title}</h2>
                <p className="mt-2 text-gray-400 leading-relaxed">{t.body}</p>
                <PointList items={t.points} />
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-20">
          <h2 className="font-display text-ivory text-3xl md:text-5xl tracking-tight">
            Further reading
          </h2>
          <p className="mt-4 max-w-2xl text-gray-400 leading-relaxed">
            Recommended materials for mastering accounting and financial reporting.
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
