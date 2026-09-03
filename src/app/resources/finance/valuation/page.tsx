import React from 'react';
import Link from 'next/link';
import CommandLine from '@/components/ui/CommandLine';
import Reveal from '@/components/ui/Reveal';

export default function ValuationPage() {
  return (
    <main className="min-h-screen bg-night text-ivory">
      <div className="max-w-4xl mx-auto px-6 md:px-10 py-14 md:py-20">
        <Reveal>
          <CommandLine cmd="FIN" note="finance guide" className="mb-4" />
          <h1 className="font-display text-ivory text-4xl md:text-6xl tracking-tight">Valuation models</h1>
          <p className="mt-5 max-w-2xl text-lg text-gray-400 leading-relaxed">
            Discover how analysts estimate a company&apos;s true worth using DCF, multiples, and intrinsic value methods.
          </p>
        </Reveal>

        <Reveal className="mt-12">
        <div className="space-y-6 text-gray-300 leading-relaxed prose-desk">
          <h2 className="text-2xl font-semibold">Discounted Cash Flow (DCF)</h2>
          <p>
            The <strong>DCF model</strong> estimates value by projecting future cash flows and discounting them to the present using a required rate of return.
          </p>
          <pre className="bg-surface2 rounded-xl p-4 text-sm text-gray-100 overflow-x-auto">
{`Intrinsic Value = Σ [ Free Cash Flow_t / (1 + r)^t ]`}
          </pre>

          <h2 className="text-2xl font-semibold">Multiples & Comparables</h2>
          <p>
            This approach values a company by comparing it to similar businesses using ratios like P/E, EV/EBITDA, or P/S.
          </p>
          <ul className="list-disc list-inside ml-4">
            <li>Price-to-Earnings (P/E) Ratio</li>
            <li>Enterprise Value / EBITDA</li>
            <li>Price-to-Sales (P/S)</li>
          </ul>

          <h2 className="text-2xl font-semibold">Intrinsic Value</h2>
          <p>
            Intrinsic value represents the “true” worth of a business based on fundamentals rather than current market prices.
            It helps investors identify undervalued or overvalued stocks.
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
