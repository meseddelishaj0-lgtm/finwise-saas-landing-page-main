import React from 'react';
import Link from 'next/link';
import CommandLine from '@/components/ui/CommandLine';
import Reveal from '@/components/ui/Reveal';

export default function RiskReturnPage() {
  return (
    <main className="min-h-screen bg-night text-ivory">
      <div className="max-w-4xl mx-auto px-6 md:px-10 py-14 md:py-20">
        <Reveal>
          <CommandLine cmd="FIN" note="finance guide" className="mb-4" />
          <h1 className="font-display text-ivory text-4xl md:text-6xl tracking-tight">Understanding risk &amp; return</h1>
          <p className="mt-5 max-w-2xl text-lg text-gray-400 leading-relaxed">
            Learn how the balance between risk and return defines every investment decision.
          </p>
        </Reveal>

        <Reveal className="mt-12">
        <div className="space-y-6 text-gray-300 leading-relaxed prose-desk">
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
        </Reveal>

        <Reveal className="mt-12">
          <Link href="/resources/finance" className="btn-ghost-gold px-5 py-2.5 text-sm">
            ← Back to finance guides
          </Link>
        </Reveal>
      </div>
    </main>
  );
}
