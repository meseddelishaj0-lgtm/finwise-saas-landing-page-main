import React from "react";
import Link from "next/link";

export default function ResourcesPage() {
  const categories = [
    {
      title: "Finance",
      slug: "finance",
      description:
        "Investment strategies, market analysis, and portfolio optimization. Learn how to build wealth with data-driven insights.",
    },
    {
      title: "Accounting",
      slug: "accounting",
      description:
        "Master accounting principles, financial statements, and auditing fundamentals with our curated study guides.",
    },
    {
      title: "Real Estate",
      slug: "real-estate",
      description:
        "Understand valuation methods, property management, and real estate investing strategies for long-term success.",
    },
    {
      title: "Insurance",
      slug: "insurance",
      description:
        "Learn risk management, underwriting, and insurance fundamentals — from life to property & casualty coverage.",
    },
    {
      title: "Taxes",
      slug: "taxes",
      description:
        "Explore tax planning, deductions, credits, and compliance strategies for individuals and businesses.",
    },
    {
      title: "Market",
      slug: "market",
      description:
        "Stay informed with insights on economic trends, stock market behavior, and global financial news.",
    },
    {
      title: "Tools & Calculators",
      slug: "tools-calculators",
      description:
        "Access powerful financial calculators, ROI analyzers, mortgage estimators, and AI-driven investment tools designed for smarter decisions.",
    },
    {
      title: "Business & Entrepreneurship",
      slug: "business-entrepreneurship",
      description:
        "Explore startup strategies, business planning, funding insights, leadership principles, and growth frameworks for modern entrepreneurs.",
    },
  ];

  return (
    <section className="min-h-screen bg-night px-6 pt-10 md:pt-12 pb-20">
      <div className="max-w-6xl mx-auto text-center">
        <h1 className="text-4xl mb-6 text-ivory font-display font-normal tracking-tight md:text-5xl">Resources</h1>
        <p className="text-lg text-gray-400 mb-12">
          Dive into professional insights across finance, accounting, real estate, insurance,
          taxes, business, and market trends — built to empower your investing and learning journey.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/resources/${cat.slug}`}
              className="p-6 rounded-2xl border shadow-sm hover:shadow-md transition bg-surface2 hover:bg-surface2 block"
            >
              <h3 className="text-xl font-semibold mb-3">{cat.title}</h3>
              <p className="text-gray-400">{cat.description}</p>
            </Link>
          ))}
        </div>

        <div className="mt-16 max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4 text-gray-100">Coming Soon</h2>
          <p className="text-gray-400">
            More advanced modules, AI tools, and case studies are on the way.
          </p>
        </div>
      </div>
    </section>
  );
}
