import React from 'react';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';

export default function ValuationPage() {
  return (
    <main className="min-h-screen bg-white py-20 px-6 text-gray-900">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <BookOpen className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-2">💹 Valuation Models</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Discover how analysts estimate a company's true worth using DCF, multiples, and intrinsic value methods.
          </p>
        </div>

        <div className="space-y-6 text-gray-700 leading-relaxed">
          <h2 className="text-2xl font-semibold">📉 Discounted Cash Flow (DCF)</h2>
          <p>
            The <strong>DCF model</strong> estimates value by projecting future cash flows and discounting them to the present using a required rate of return.
          </p>
          <pre className="bg-gray-100 rounded-xl p-4 text-sm text-gray-800 overflow-x-auto">
{`Intrinsic Value = Σ [ Free Cash Flow_t / (1 + r)^t ]`}
          </pre>

          <h2 className="text-2xl font-semibold">📊 Multiples & Comparables</h2>
          <p>
            This approach values a company by comparing it to similar businesses using ratios like P/E, EV/EBITDA, or P/S.
          </p>
          <ul className="list-disc list-inside ml-4">
            <li>Price-to-Earnings (P/E) Ratio</li>
            <li>Enterprise Value / EBITDA</li>
            <li>Price-to-Sales (P/S)</li>
          </ul>

          <h2 className="text-2xl font-semibold">💡 Intrinsic Value</h2>
          <p>
            Intrinsic value represents the “true” worth of a business based on fundamentals rather than current market prices.
            It helps investors identify undervalued or overvalued stocks.
          </p>
        </div>

        <div className="text-center mt-10">
          <Link
            href="/resources/finance"
            className="inline-block bg-yellow-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-yellow-600 transition"
          >
            ← Back to Finance Resources
          </Link>
        </div>
      </div>
    </main>
  );
}
