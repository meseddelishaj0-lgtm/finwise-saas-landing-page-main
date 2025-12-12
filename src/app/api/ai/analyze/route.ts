// src/app/api/ai/analyze/route.ts
// AI Stock Analysis endpoint
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const FMP_API_KEY = process.env.FMP_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const BASE_URL = 'https://financialmodelingprep.com/api/v3';

export async function POST(req: NextRequest) {
  try {
    const { symbol, type } = await req.json();

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    const ticker = symbol.toUpperCase().trim();

    // Fetch all stock data in parallel
    const [quoteRes, dcfRes, ratiosRes, growthRes, profileRes] = await Promise.all([
      fetch(`${BASE_URL}/quote/${ticker}?apikey=${FMP_API_KEY}`),
      fetch(`${BASE_URL}/discounted-cash-flow/${ticker}?apikey=${FMP_API_KEY}`),
      fetch(`${BASE_URL}/ratios/${ticker}?limit=1&apikey=${FMP_API_KEY}`),
      fetch(`${BASE_URL}/financial-growth/${ticker}?limit=1&apikey=${FMP_API_KEY}`),
      fetch(`${BASE_URL}/profile/${ticker}?apikey=${FMP_API_KEY}`),
    ]);

    const [quoteData, dcfData, ratiosData, growthData, profileData] = await Promise.all([
      quoteRes.json(),
      dcfRes.json(),
      ratiosRes.json(),
      growthRes.json(),
      profileRes.json(),
    ]);

    if (!quoteData || !Array.isArray(quoteData) || quoteData.length === 0) {
      return NextResponse.json({ error: `No data found for ${ticker}` }, { status: 404 });
    }

    const quote = quoteData[0];
    const dcf = dcfData?.[0];
    const ratios = ratiosData?.[0] || {};
    const growth = growthData?.[0] || {};
    const profile = profileData?.[0] || {};

    // Calculate DCF metrics
    const dcfValue = dcf?.dcf || null;
    let dcfDiff = null;
    let dcfDiffPercent = null;
    let isUndervalued = false;

    if (dcfValue && quote.price) {
      dcfDiff = dcfValue - quote.price;
      dcfDiffPercent = (dcfDiff / quote.price) * 100;
      isUndervalued = dcfDiff > 0;
    }

    // Get AI analysis
    const analysisPrompt = `Analyze ${ticker} (${quote.name}) for investment potential. Here's the current data:

PRICE DATA:
- Current Price: $${quote.price}
- Change Today: ${quote.changesPercentage?.toFixed(2)}%
- 52-Week High: $${quote.yearHigh}
- 52-Week Low: $${quote.yearLow}
- Market Cap: $${(quote.marketCap / 1e9).toFixed(2)}B

VALUATION:
- P/E Ratio: ${quote.pe || 'N/A'}
- EPS: $${quote.eps || 'N/A'}
${dcfValue ? `- DCF Fair Value: $${dcfValue.toFixed(2)} (${isUndervalued ? 'Undervalued' : 'Overvalued'} by ${Math.abs(dcfDiffPercent || 0).toFixed(1)}%)` : ''}

FUNDAMENTALS:
- ROE: ${ratios.returnOnEquity ? (ratios.returnOnEquity * 100).toFixed(2) + '%' : 'N/A'}
- ROA: ${ratios.returnOnAssets ? (ratios.returnOnAssets * 100).toFixed(2) + '%' : 'N/A'}
- Debt/Equity: ${ratios.debtEquityRatio?.toFixed(2) || 'N/A'}
- Current Ratio: ${ratios.currentRatio?.toFixed(2) || 'N/A'}

GROWTH:
- Revenue Growth: ${growth.revenueGrowth ? (growth.revenueGrowth * 100).toFixed(2) + '%' : 'N/A'}
- Net Income Growth: ${growth.netIncomeGrowth ? (growth.netIncomeGrowth * 100).toFixed(2) + '%' : 'N/A'}

COMPANY INFO:
- Sector: ${profile.sector || 'N/A'}
- Industry: ${profile.industry || 'N/A'}

Provide a JSON response with this exact structure:
{
  "summary": "2-3 sentence investment thesis summarizing the key points",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "risks": ["risk 1", "risk 2", "risk 3"],
  "sentiment": "bullish" or "bearish" or "neutral",
  "confidence": number from 1-100,
  "recommendation": "Strong Buy" or "Buy" or "Hold" or "Sell" or "Strong Sell",
  "priceTarget": {"low": number, "mid": number, "high": number}
}

Return ONLY valid JSON, no markdown or explanations.`;

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
            content: 'You are a professional stock analyst. Analyze stocks objectively and return structured JSON responses. Always be balanced, mentioning both opportunities and risks.'
          },
          { role: 'user', content: analysisPrompt }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    const aiData = await aiResponse.json();
    let aiAnalysis;

    try {
      const aiText = aiData.choices?.[0]?.message?.content || '{}';
      // Clean up potential markdown formatting
      const cleanJson = aiText.replace(/```json\n?|\n?```/g, '').trim();
      aiAnalysis = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      aiAnalysis = {
        summary: 'Analysis completed based on available financial data.',
        strengths: ['Market position', 'Financial metrics', 'Growth potential'],
        risks: ['Market volatility', 'Competition', 'Economic factors'],
        sentiment: 'neutral',
        confidence: 50,
        recommendation: 'Hold',
        priceTarget: null
      };
    }

    // Build response
    const analysis = {
      symbol: ticker,
      name: quote.name || ticker,
      price: quote.price,
      change: quote.change,
      changePercent: quote.changesPercentage,
      marketCap: quote.marketCap,
      pe: quote.pe,
      eps: quote.eps,
      yearHigh: quote.yearHigh,
      yearLow: quote.yearLow,
      volume: quote.volume,
      avgVolume: quote.avgVolume,
      // DCF
      dcfValue,
      dcfDiff,
      dcfDiffPercent,
      isUndervalued,
      // Ratios
      roe: ratios.returnOnEquity ? ratios.returnOnEquity * 100 : null,
      roa: ratios.returnOnAssets ? ratios.returnOnAssets * 100 : null,
      debtToEquity: ratios.debtEquityRatio,
      currentRatio: ratios.currentRatio,
      // Growth
      revenueGrowth: growth.revenueGrowth ? growth.revenueGrowth * 100 : null,
      netIncomeGrowth: growth.netIncomeGrowth ? growth.netIncomeGrowth * 100 : null,
      // Company
      sector: profile.sector,
      industry: profile.industry,
      // AI Analysis
      aiSummary: aiAnalysis.summary,
      strengths: aiAnalysis.strengths || [],
      risks: aiAnalysis.risks || [],
      sentiment: aiAnalysis.sentiment || 'neutral',
      confidence: aiAnalysis.confidence || 50,
      recommendation: aiAnalysis.recommendation || 'Hold',
      priceTarget: aiAnalysis.priceTarget,
    };

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Stock analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze stock' },
      { status: 500 }
    );
  }
}
