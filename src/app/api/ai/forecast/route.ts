// src/app/api/ai/forecast/route.ts
// AI Price Forecast endpoint
import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/rateLimit';
import { getQuote, getTimeSeries, latestIndicator } from '@/lib/twelvedata';
import { fmp, getQuoteStats } from '@/lib/fmp';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function POST(req: NextRequest) {
  const _rl = enforceRateLimit(req, 'ai', 15, 60_000);
  if (_rl) return _rl;
  try {
    const { symbol, timeframe = '3 months' } = await req.json();

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    const ticker = symbol.toUpperCase().trim();

    // Price, daily bars and RSI come from Twelve Data (1 credit each). `bars`
    // is oldest-first, so the index maths below reads forward. Valuation
    // fields and the analyst estimate come from FMP (see TWELVEDATA_MIGRATION.md).
    const [quote, statsBySymbol, bars, rsi, estimates] = await Promise.all([
      getQuote(ticker),
      getQuoteStats([ticker]),
      getTimeSeries(ticker, '1day', 90, { ttl: 5 * 60_000 }),
      latestIndicator(ticker, 'rsi', '1day', { time_period: 14 }),
      fmp<Record<string, any>[]>(
        `v3/analyst-estimates/${encodeURIComponent(ticker)}`,
        { limit: 8 },
        6 * 60 * 60_000
      ),
    ]);

    if (!quote || !quote.price) {
      return NextResponse.json({ error: `No data found for ${ticker}` }, { status: 404 });
    }

    const stats = statsBySymbol[ticker] ?? null;
    // Estimates arrive newest-first and run years out; use the nearest fiscal
    // year that has not ended yet.
    const today = new Date().toISOString().slice(0, 10);
    const estimate =
      (Array.isArray(estimates) ? estimates : [])
        .filter((e) => typeof e?.date === 'string' && e.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;
    const rsiValue = rsi?.rsi ? Number(rsi.rsi) : null;

    // Calculate technical metrics
    let momentum = 0;
    let volatility = 0;
    let support = quote.yearLow ?? quote.price * 0.9;
    let resistance = quote.yearHigh ?? quote.price * 1.1;
    let trend: 'uptrend' | 'downtrend' | 'sideways' = 'sideways';

    if (bars.length >= 20) {
      const closes = bars.map((b) => b.c);
      const last20 = closes.slice(-20);

      // 20-session momentum
      const oldPrice = last20[0];
      const newPrice = last20[last20.length - 1];
      if (oldPrice) momentum = ((newPrice - oldPrice) / oldPrice) * 100;

      // Volatility: standard deviation of daily returns over the window
      const returns: number[] = [];
      for (let i = 1; i < last20.length; i++) {
        if (last20[i - 1]) returns.push((last20[i] - last20[i - 1]) / last20[i - 1]);
      }
      if (returns.length) {
        const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        volatility =
          Math.sqrt(
            returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
          ) * 100;
      }

      // Trend against the 20-session mean
      const ma20 = last20.reduce((a, b) => a + b, 0) / last20.length;
      if (quote.price > ma20 * 1.02) trend = 'uptrend';
      else if (quote.price < ma20 * 0.98) trend = 'downtrend';

      // Support and resistance from the last 30 sessions
      const recent = closes.slice(-30);
      support = Math.min(...recent) * 0.98;
      resistance = Math.max(...recent) * 1.02;
    }

    // Get AI forecast
    const forecastPrompt = `Generate a ${timeframe} price forecast for ${ticker} (${quote.name}).

CURRENT DATA:
- Price: $${quote.price}
- Change: ${quote.changesPercentage?.toFixed(2)}%
- 52-Week Range: $${quote.yearLow ?? 'N/A'} - $${quote.yearHigh ?? 'N/A'}
- Market Cap: ${stats?.marketCap ? '$' + (stats.marketCap / 1e9).toFixed(2) + 'B' : 'N/A'}
- P/E: ${stats?.pe?.toFixed(2) || 'N/A'}

TECHNICAL INDICATORS:
- 20-Day Momentum: ${momentum.toFixed(2)}%
- Volatility: ${volatility.toFixed(2)}%
- Trend: ${trend}
- Support: $${support.toFixed(2)}
- Resistance: $${resistance.toFixed(2)}
- RSI (14): ${rsiValue != null ? rsiValue.toFixed(1) : 'N/A'}
- 50-Day MA: ${stats?.priceAvg50 ? '$' + stats.priceAvg50.toFixed(2) : 'N/A'}
- 200-Day MA: ${stats?.priceAvg200 ? '$' + stats.priceAvg200.toFixed(2) : 'N/A'}

${estimate?.estimatedEpsAvg ? `ANALYST ESTIMATES (fiscal year ending ${estimate.date}):
- EPS Estimate: $${estimate.estimatedEpsAvg} (range $${estimate.estimatedEpsLow ?? '?'} to $${estimate.estimatedEpsHigh ?? '?'})
- Revenue Estimate: ${estimate.estimatedRevenueAvg ? '$' + (estimate.estimatedRevenueAvg / 1e9).toFixed(2) + 'B' : 'N/A'}
- Analysts Covering: ${estimate.numberAnalystsEstimatedEps ?? 'N/A'}` : ''}

Provide a JSON forecast with this exact structure:
{
  "priceTargets": {
    "conservative": number (bearish scenario price),
    "base": number (most likely price),
    "bullish": number (optimistic price)
  },
  "probabilities": {
    "upside": number (0-100, chance price goes up),
    "downside": number (0-100, chance price goes down)
  },
  "sentiment": "bullish" or "bearish" or "neutral",
  "confidence": number (1-100),
  "recommendation": "Strong Buy" or "Buy" or "Hold" or "Sell" or "Strong Sell",
  "catalysts": ["catalyst 1", "catalyst 2", "catalyst 3"],
  "risks": ["risk 1", "risk 2", "risk 3"],
  "summary": "2-3 sentence forecast summary"
}

Return ONLY valid JSON.`;

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a quantitative analyst specializing in price forecasting. Provide realistic, data-driven forecasts. Always include disclaimers about uncertainty.'
          },
          { role: 'user', content: forecastPrompt }
        ],
        max_tokens: 800,
        temperature: 0.4,
      }),
    });

    const aiData = await aiResponse.json();
    let aiForecast;

    try {
      const aiText = aiData.choices?.[0]?.message?.content || '{}';
      const cleanJson = aiText.replace(/```json\n?|\n?```/g, '').trim();
      aiForecast = JSON.parse(cleanJson);
    } catch {
      // Default forecast based on momentum
      const baseTarget = quote.price * (1 + momentum / 100);
      aiForecast = {
        priceTargets: {
          conservative: quote.price * 0.9,
          base: baseTarget,
          bullish: quote.price * 1.15
        },
        probabilities: { upside: 50, downside: 50 },
        sentiment: 'neutral',
        confidence: 40,
        recommendation: 'Hold',
        catalysts: ['Earnings report', 'Market conditions', 'Sector performance'],
        risks: ['Market volatility', 'Economic uncertainty', 'Competition'],
        summary: 'Forecast generated based on technical indicators. Recommend monitoring key levels.'
      };
    }

    const forecast = {
      symbol: ticker,
      name: quote.name,
      currentPrice: quote.price,
      change: quote.change,
      changePercent: quote.changesPercentage,
      yearHigh: quote.yearHigh,
      yearLow: quote.yearLow,
      momentum,
      volatility,
      rsi: rsiValue,
      avgVolume: quote.avgVolume,
      priceTargets: aiForecast.priceTargets,
      probabilities: aiForecast.probabilities,
      timeframe,
      sentiment: aiForecast.sentiment,
      confidence: aiForecast.confidence,
      recommendation: aiForecast.recommendation,
      catalysts: aiForecast.catalysts || [],
      risks: aiForecast.risks || [],
      technicalSignals: {
        trend,
        support,
        resistance,
        rsi: rsiValue,
        day50MA: stats?.priceAvg50 ?? null,
        day200MA: stats?.priceAvg200 ?? null,
      },
      summary: aiForecast.summary,
    };

    return NextResponse.json(forecast);
  } catch (error) {
    console.error('Forecast error:', error);
    return NextResponse.json(
      { error: 'Failed to generate forecast' },
      { status: 500 }
    );
  }
}
