// src/app/api/ai/forecast/route.ts
// AI Price Forecast endpoint
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const FMP_API_KEY = process.env.FMP_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const BASE_URL = 'https://financialmodelingprep.com/api/v3';

export async function POST(req: NextRequest) {
  try {
    const { symbol, timeframe = '3 months' } = await req.json();

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    const ticker = symbol.toUpperCase().trim();

    // Fetch stock data
    const [quoteRes, historicalRes, analystRes] = await Promise.all([
      fetch(`${BASE_URL}/quote/${ticker}?apikey=${FMP_API_KEY}`),
      fetch(`${BASE_URL}/historical-price-full/${ticker}?timeseries=90&apikey=${FMP_API_KEY}`),
      fetch(`${BASE_URL}/analyst-estimates/${ticker}?limit=1&apikey=${FMP_API_KEY}`),
    ]);

    const [quoteData, historicalData, analystData] = await Promise.all([
      quoteRes.json(),
      historicalRes.json(),
      analystRes.json(),
    ]);

    if (!quoteData || !Array.isArray(quoteData) || quoteData.length === 0) {
      return NextResponse.json({ error: `No data found for ${ticker}` }, { status: 404 });
    }

    const quote = quoteData[0];
    const historical = historicalData?.historical || [];
    const analyst = analystData?.[0] || {};

    // Calculate technical metrics
    let momentum = 0;
    let volatility = 0;
    let support = quote.yearLow;
    let resistance = quote.yearHigh;
    let trend: 'uptrend' | 'downtrend' | 'sideways' = 'sideways';

    if (historical.length >= 20) {
      // Calculate 20-day momentum
      const prices = historical.slice(0, 20).map((d: any) => d.close);
      const oldPrice = prices[prices.length - 1];
      const newPrice = prices[0];
      momentum = ((newPrice - oldPrice) / oldPrice) * 100;

      // Calculate volatility (standard deviation of daily returns)
      const returns = [];
      for (let i = 1; i < prices.length; i++) {
        returns.push((prices[i - 1] - prices[i]) / prices[i]);
      }
      const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      volatility = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length) * 100;

      // Determine trend
      const ma20 = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
      if (quote.price > ma20 * 1.02) trend = 'uptrend';
      else if (quote.price < ma20 * 0.98) trend = 'downtrend';

      // Calculate support/resistance from recent prices
      const recentPrices = historical.slice(0, 30).map((d: any) => d.close);
      support = Math.min(...recentPrices) * 0.98;
      resistance = Math.max(...recentPrices) * 1.02;
    }

    // Get AI forecast
    const forecastPrompt = `Generate a ${timeframe} price forecast for ${ticker} (${quote.name}).

CURRENT DATA:
- Price: $${quote.price}
- Change: ${quote.changesPercentage?.toFixed(2)}%
- 52-Week Range: $${quote.yearLow} - $${quote.yearHigh}
- Market Cap: $${(quote.marketCap / 1e9).toFixed(2)}B
- P/E: ${quote.pe || 'N/A'}

TECHNICAL INDICATORS:
- 20-Day Momentum: ${momentum.toFixed(2)}%
- Volatility: ${volatility.toFixed(2)}%
- Trend: ${trend}
- Support: $${support.toFixed(2)}
- Resistance: $${resistance.toFixed(2)}

${analyst.estimatedEpsAvg ? `ANALYST ESTIMATES:
- EPS Estimate: $${analyst.estimatedEpsAvg}
- Revenue Estimate: $${(analyst.estimatedRevenueAvg / 1e9).toFixed(2)}B` : ''}

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
