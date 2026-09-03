import React from 'react';
import Link from 'next/link';
import CommandLine from '@/components/ui/CommandLine';
import Reveal from '@/components/ui/Reveal';

export default function BehavioralFinancePage() {
  return (
    <main className="min-h-screen bg-night text-ivory">
      <div className="max-w-4xl mx-auto px-6 md:px-10 py-14 md:py-20">
        <Reveal>
          <CommandLine cmd="FIN" note="finance guide" className="mb-4" />
          <h1 className="font-display text-ivory text-4xl md:text-6xl tracking-tight">Behavioral finance</h1>
          <p className="mt-5 max-w-2xl text-lg text-gray-400 leading-relaxed">
            Understand how emotions and cognitive biases affect investor decisions and market outcomes.
          </p>
        </Reveal>

        <Reveal className="mt-12">
        <div className="space-y-6 text-gray-300 leading-relaxed prose-desk">
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
