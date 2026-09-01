import React from 'react';
import Link from 'next/link';
import { TrendingUp } from 'lucide-react';

export default function RiskReturnPage() {
  return (
    <main className="min-h-screen bg-night py-14 px-6 text-ivory">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <TrendingUp className="w-12 h-12 text-gold mx-auto mb-4" />
          <h1 className="text-4xl mb-2 font-display font-normal tracking-tight md:text-5xl">Understanding Risk & Return</h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Learn how the balance between risk and return defines every investment decision.
          </p>
        </div>

        <div className="space-y-6 text-gray-300 leading-relaxed">
          <p>
            Every investment carries risk — the possibility of losing money — and potential return — the profit expected
            for taking that risk. Investors must balance these forces to achieve their goals.
          </p>

          <h2 className="text-2xl font-semibold mt-6">Risk Types</h2>
          <ul className="list-disc list-inside ml-4">
            <li><strong>Systematic Risk:</strong> Market-wide factors (inflation, interest rates, wars).</li>
            <li><strong>Unsystematic Risk:</strong> Company-specific events like management changes or product recalls.</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-6">Measuring Risk</h2>
          <p>
            The most common measure of risk is <strong>standard deviation</strong>, which shows how much returns vary
            from the average. A higher deviation means higher volatility.
          </p>

          <h2 className="text-2xl font-semibold mt-6">The Risk–Return Tradeoff</h2>
          <p>
            Higher potential returns usually come with higher risk. This tradeoff forms the foundation of portfolio theory,
            where diversification can reduce risk without proportionally reducing returns.
          </p>
        </div>

        <div className="text-center mt-10">
          <Link
            href="/resources/finance"
            className="inline-block bg-gold text-night px-6 py-3 rounded-xl font-semibold hover:bg-gold-deep transition"
          >
            ← Back to Finance Resources
          </Link>
        </div>
      </div>
    </main>
  );
}
