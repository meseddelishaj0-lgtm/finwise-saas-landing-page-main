import React from 'react';
import Link from 'next/link';
import { Brain } from 'lucide-react';

export default function BehavioralFinancePage() {
  return (
    <main className="min-h-screen bg-night py-14 px-6 text-ivory">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <Brain className="w-12 h-12 text-gold mx-auto mb-4" />
          <h1 className="text-4xl mb-2 font-display font-normal tracking-tight md:text-5xl">Behavioral Finance</h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Understand how emotions and cognitive biases affect investor decisions and market outcomes.
          </p>
        </div>

        <div className="space-y-6 text-gray-300 leading-relaxed">
          <h2 className="text-2xl font-semibold">Common Biases</h2>
          <ul className="list-disc list-inside ml-4">
            <li><strong>Overconfidence:</strong> Investors overestimate their ability to predict outcomes.</li>
            <li><strong>Herd Behavior:</strong> Following the crowd rather than individual analysis.</li>
            <li><strong>Loss Aversion:</strong> Pain of loss outweighs the joy of gain.</li>
          </ul>

          <h2 className="text-2xl font-semibold">Impact on Markets</h2>
          <p>
            Behavioral factors often cause markets to deviate from efficiency. Understanding these patterns can help you
            exploit short-term mispricings or avoid panic-driven mistakes.
          </p>

          <h2 className="text-2xl font-semibold">How to Manage Bias</h2>
          <p>
            Awareness, diversification, and disciplined rebalancing can help mitigate emotional decision-making.
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
