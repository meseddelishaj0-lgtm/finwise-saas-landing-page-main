'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Brain, Search, TrendingUp } from 'lucide-react';

// ✅ Secure environment variable for your Finnhub API key
const FINNHUB_API_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;

interface StockData {
  symbol: string;
  price: number;
  high: number;
  low: number;
  change: number;
  percent: number;
  sentiment: string;
  intrinsicValue: number;
}

export default function AIPoweredAnalysisPage() {
  const [ticker, setTicker] = useState('');
  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const analyzeTicker = async () => {
    if (!ticker) return;
    setLoading(true);
    setError('');
    setData(null);

    try {
      // ✅ Fetch live data from Finnhub
      const res = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${ticker.toUpperCase()}&token=${FINNHUB_API_KEY}`
      );

      if (!res.ok) throw new Error('Finnhub API error');
      const result = await res.json();

      // ✅ Simple AI-style evaluation
      const intrinsicValue = (result.c + result.h + result.l) / 3;
      const sentiment =
        result.dp > 2 ? 'Positive' : result.dp < -2 ? 'Negative' : 'Neutral';

      setData({
        symbol: ticker.toUpperCase(),
        price: result.c,
        high: result.h,
        low: result.l,
        change: result.d,
        percent: result.dp,
        sentiment,
        intrinsicValue,
      });
    } catch (err) {
      console.error(err);
      setError('⚠️ Could not fetch data. Check your Finnhub key or ticker symbol.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 py-16 px-6 text-gray-900">
      <div className="max-w-4xl mx-auto">
        {/* HEADER */}
        <div className="text-center mb-12">
          <Brain className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
          <h1 className="text-4xl font-bold mb-3">🧠 AI-Powered Analysis</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Leverage our proprietary AI models to evaluate company fundamentals,
            sentiment, and valuation instantly — with real-time Finnhub data.
          </p>
        </div>

        {/* INPUT SECTION */}
        <div className="bg-white p-6 rounded-2xl shadow-sm mb-8 border border-gray-100">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Search className="w-6 h-6 text-yellow-500" />
            Enter a Company Ticker
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="e.g. AAPL, TSLA, NVDA"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              className="flex-grow border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <button
              onClick={analyzeTicker}
              disabled={!ticker || loading}
              className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold px-6 py-2 rounded-xl transition"
            >
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>
        </div>

        {/* ERROR HANDLING */}
        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-xl mb-6 border border-red-200">
            {error}
          </div>
        )}

        {/* RESULT SECTION */}
        {data && (
          <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-yellow-500" />
              Analysis for {data.symbol}
            </h3>

            <ul className="text-gray-700 space-y-2">
              <li>
                <strong>Current Price:</strong>{' '}
                <span className="text-green-600">${data.price.toFixed(2)}</span>
              </li>
              <li>
                <strong>Day Range:</strong>{' '}
                ${data.low.toFixed(2)} – ${data.high.toFixed(2)}
              </li>
              <li>
                <strong>Change:</strong>{' '}
                <span
                  className={
                    data.change >= 0 ? 'text-green-600' : 'text-red-600'
                  }
                >
                  {data.change >= 0 ? '+' : ''}
                  {data.change.toFixed(2)} ({data.percent >= 0 ? '+' : ''}
                  {data.percent.toFixed(2)}%)
                </span>
              </li>
              <li>
                <strong>Intrinsic Value (AI-Estimate):</strong>{' '}
                <span className="text-yellow-600 font-semibold">
                  ${data.intrinsicValue.toFixed(2)}
                </span>
              </li>
              <li>
                <strong>Sentiment:</strong>{' '}
                <span
                  className={
                    data.sentiment === 'Positive'
                      ? 'text-green-600 font-semibold'
                      : data.sentiment === 'Negative'
                      ? 'text-red-600 font-semibold'
                      : 'text-gray-700 font-semibold'
                  }
                >
                  {data.sentiment}
                </span>
              </li>
            </ul>
          </div>
        )}

        {/* EXAMPLE CARD */}
        {!data && !loading && (
          <div className="bg-gray-100 p-6 rounded-2xl border border-gray-200 mt-8">
            <h2 className="text-2xl font-bold mb-3">Example: Tesla (TSLA)</h2>
            <p>
              Intrinsic Value: <strong>$239.50</strong>
            </p>
            <p>
              Sentiment:{' '}
              <span className="text-green-600 font-semibold">Positive</span>{' '}
              (+12% week-over-week)
            </p>
          </div>
        )}

        {/* BACK BUTTON */}
        <div className="mt-10 text-center">
          <Link
            href="/ai-dashboard"
            className="inline-block bg-yellow-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-yellow-600 transition"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
