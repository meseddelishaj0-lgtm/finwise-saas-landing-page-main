'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import CommandLine from '@/components/ui/CommandLine';
import Reveal from '@/components/ui/Reveal';

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

const inputClass =
  'w-full rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 font-monodata uppercase text-ivory placeholder:normal-case placeholder:text-gray-600 transition-colors focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/25';

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
      // Fetch live data from Finnhub
      const res = await fetch(
        `/api/proxy/finnhub/api/v1/quote?symbol=${ticker.toUpperCase()}`
      );

      if (!res.ok) throw new Error('Finnhub API error');
      const result = await res.json();

      // Simple AI-style evaluation
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
      setError('Could not fetch data. Check your Finnhub key or ticker symbol.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-night text-ivory">
      <div className="max-w-4xl mx-auto px-6 md:px-10 py-14 md:py-20">
        {/* HEADER */}
        <Reveal>
          <CommandLine cmd="FIN" note="ai ticker analysis" className="mb-4" />
          <h1 className="font-display text-ivory text-4xl md:text-6xl tracking-tight">AI-powered analysis</h1>
          <p className="mt-5 max-w-2xl text-lg text-gray-400 leading-relaxed">
            Evaluate a company&apos;s live quote, day range, and an AI-style intrinsic value estimate,
            with real-time Finnhub data.
          </p>
        </Reveal>

        {/* INPUT SECTION */}
        <Reveal className="mt-12">
          <div className="card-night p-6 md:p-8">
            <h2 className="text-lg md:text-xl font-semibold text-ivory">Enter a company ticker</h2>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <label htmlFor="ticker" className="sr-only">
                Ticker symbol
              </label>
              <input
                id="ticker"
                type="text"
                placeholder="e.g. AAPL, TSLA, NVDA"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') analyzeTicker();
                }}
                className={inputClass}
              />
              <button
                onClick={analyzeTicker}
                disabled={!ticker || loading}
                className="btn-gold px-5 py-2.5 text-sm shrink-0 disabled:opacity-60"
              >
                {loading ? 'Analyzing…' : 'Analyze'}
              </button>
            </div>
          </div>
        </Reveal>

        {/* ERROR HANDLING */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* RESULT SECTION */}
        {data && (
          <div className="card-night mt-6 p-6 md:p-8">
            <h3 className="text-lg md:text-xl font-semibold text-ivory">Analysis for {data.symbol}</h3>

            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
              <div>
                <dt className="font-monodata text-[11px] uppercase tracking-widest text-gray-500">Current price</dt>
                <dd className="mt-1 font-monodata tabular-nums text-ivory">${data.price.toFixed(2)}</dd>
              </div>
              <div>
                <dt className="font-monodata text-[11px] uppercase tracking-widest text-gray-500">Day range</dt>
                <dd className="mt-1 font-monodata tabular-nums text-ivory">
                  ${data.low.toFixed(2)} – ${data.high.toFixed(2)}
                </dd>
              </div>
              <div>
                <dt className="font-monodata text-[11px] uppercase tracking-widest text-gray-500">Change</dt>
                <dd
                  className={`mt-1 font-monodata tabular-nums ${
                    data.change >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {data.change >= 0 ? '+' : ''}
                  {data.change.toFixed(2)} ({data.percent >= 0 ? '+' : ''}
                  {data.percent.toFixed(2)}%)
                </dd>
              </div>
              <div>
                <dt className="font-monodata text-[11px] uppercase tracking-widest text-gray-500">
                  Intrinsic value (AI estimate)
                </dt>
                <dd className="mt-1 font-monodata tabular-nums text-gold">${data.intrinsicValue.toFixed(2)}</dd>
              </div>
              <div>
                <dt className="font-monodata text-[11px] uppercase tracking-widest text-gray-500">Sentiment</dt>
                <dd
                  className={`mt-1 font-semibold ${
                    data.sentiment === 'Positive'
                      ? 'text-green-400'
                      : data.sentiment === 'Negative'
                      ? 'text-red-400'
                      : 'text-gray-300'
                  }`}
                >
                  {data.sentiment}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {/* EXAMPLE CARD */}
        {!data && !loading && (
          <Reveal className="mt-6">
            <div className="card-night p-6 md:p-8">
              <p className="font-monodata text-[11px] uppercase tracking-widest text-gray-500">Example</p>
              <h2 className="mt-3 text-lg md:text-xl font-semibold text-ivory">Tesla (TSLA)</h2>
              <p className="mt-2 text-gray-300">
                Intrinsic value: <strong className="font-monodata tabular-nums text-ivory">$239.50</strong>
              </p>
              <p className="mt-1 text-gray-300">
                Sentiment: <span className="font-semibold text-green-400">Positive</span> (+12% week-over-week)
              </p>
            </div>
          </Reveal>
        )}

        {/* BACK BUTTON */}
        <Reveal className="mt-12">
          <div className="flex flex-wrap gap-3">
            <Link href="/resources/finance" className="btn-ghost-gold px-5 py-2.5 text-sm">
              ← Back to finance guides
            </Link>
            <Link href="/ai-dashboard" className="btn-ghost-gold px-5 py-2.5 text-sm">
              Open the AI dashboard
            </Link>
          </div>
        </Reveal>
      </div>
    </main>
  );
}
