"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function InstitutionalAccessPage() {
  return (
    <main className="min-h-screen bg-night text-ivory flex flex-col items-center py-14 px-6">
      {/* Header */}
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-4xl md:text-5xl text-center text-ivory mb-6 font-display font-normal tracking-tight"
      >
        Institutional Access
      </motion.h1>

      <p className="text-gray-400 text-center max-w-3xl mb-12 text-lg">
        Built for{" "}
        <span className="text-gold font-semibold">
          Hedge Funds, RIAs, Family Offices
        </span>
        , and professional investment firms seeking institutional-grade AI
        research, market analytics, and quantitative intelligence.
      </p>

      {/* Features Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full mb-20">
        {[
          {
            title: "AI Market Intelligence",
            desc: "Access institutional-grade AI dashboards providing macro, equities, ETF, derivatives, and fixed income insights.",
          },
          {
            title: "Custom Quant Models",
            desc: "Deploy custom-built valuation frameworks, factor models, and portfolio optimization tools tailored to your fund.",
          },
          {
            title: "Private Data API",
            desc: "Integrate real-time feeds via WallStreetStocks API for automation, backtesting, and quantitative analytics.",
          },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.2 }}
            className="bg-surface2 border border-white/10 rounded-2xl p-8 shadow-md hover:shadow-lg hover:border-gold/60 transition-all"
          >
            <h3 className="text-xl font-semibold text-gold mb-3">
              {item.title}
            </h3>
            <p className="text-gray-300 text-sm leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* Subscription Plans */}
      <div className="max-w-4xl w-full text-center mb-20">
        <h2 className="text-3xl font-bold mb-4 text-gold">
          Institutional Plans
        </h2>
        <p className="text-gray-500 mb-10">
          Choose your access level based on data depth, research frequency, and
          custom integrations.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              tier: "Institutional Basic",
              price: "$199/mo",
              link: "/institutional-access/basic",
              features: [
                "AI dashboards & analytics",
                "ETF & Equity Data Access",
                "Stock Market Insights",
                "Custom Research Reports",
                "Fundamental Analysis",
                "Email Support",
              ],
            },
            {
              tier: "Institutional Pro",
              price: "$299/mo",
              link: "/institutional-access/pro",
              features: [
                "Custom Quant Models",
                "Private API Access",
                "Dedicated Account Manager",
                "Real-time Data Feeds",
                "Advanced Research Tools",
                "Valuation Frameworks",
              ],
            },
            {
              tier: "Institutional Premium",
              price: "$499/mo",
              link: "/institutional-access/premium",
              features: [
                "Unlimited Data Access",
                "Research Automation Tools",
                "24/7 Priority Support",
                "Expert Valuation Models",
                "Portfolio Optimization",
                "Top 10 Stock Picks Monthly",
              ],
            },
          ].map((plan, i) => (
            <div
              key={i}
              className="bg-surface border border-white/10 rounded-2xl p-8 shadow-md hover:shadow-xl hover:border-gold/60 transition-all flex flex-col justify-between"
            >
              <div>
                <h3 className="text-2xl font-semibold text-gold mb-2">
                  {plan.tier}
                </h3>
                <p className="text-gray-500 mb-4">{plan.price}</p>
                <ul className="text-sm text-gray-300 space-y-2 mb-6">
                  {plan.features.map((f, j) => (
                    <li key={j}>• {f}</li>
                  ))}
                </ul>
              </div>

              <Link
                href={plan.link}
                className="bg-gold text-night px-4 py-2 rounded-full font-semibold hover:bg-gold-deep transition"
              >
                Subscribe
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="text-center">
        <h3 className="text-2xl font-semibold text-gold mb-4">
          Empower Your Fund With AI-Powered Research
        </h3>
        <Link
          href="/register"
          className="bg-gold text-night px-6 py-3 rounded-full font-bold hover:bg-gold-deep transition-all shadow-md"
        >
          Request Institutional Access
        </Link>
      </div>
    </main>
  );
}
