// src/app/api/ai/chat/route.ts
// AI Chat endpoint for the mobile app assistant
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const FMP_API_KEY = process.env.FMP_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Fetch stock data if ticker mentioned
async function getStockContext(message: string): Promise<string> {
  const tickerMatch = message.toUpperCase().match(/\$?([A-Z]{1,5})\b/);
  if (!tickerMatch) return '';

  try {
    const symbol = tickerMatch[1];
    const res = await fetch(
      `https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${FMP_API_KEY}`
    );
    const data = await res.json();

    if (data && data[0]) {
      const q = data[0];
      return `\n\n[Current market data for ${q.symbol} (${q.name}):
- Price: $${q.price?.toFixed(2)}
- Change: ${q.change >= 0 ? '+' : ''}${q.change?.toFixed(2)} (${q.changesPercentage?.toFixed(2)}%)
- Market Cap: $${(q.marketCap / 1e9)?.toFixed(2)}B
- P/E Ratio: ${q.pe?.toFixed(2) || 'N/A'}
- 52-Week High: $${q.yearHigh?.toFixed(2)}
- 52-Week Low: $${q.yearLow?.toFixed(2)}
- Volume: ${(q.volume / 1e6)?.toFixed(2)}M]`;
    }
  } catch (e) {
    console.error('Error fetching stock data:', e);
  }
  return '';
}

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    // Get stock context if user mentions a ticker
    const stockContext = await getStockContext(message);

    // Build conversation history
    const messages = [
      {
        role: 'system',
        content: `You are WallStreetStocks AI, an expert trading and investment assistant. You help users with:
- Stock analysis and research
- Market trends and insights
- Portfolio strategies and diversification
- Technical and fundamental analysis
- Risk management
- Educational content about investing

Be helpful, concise, and actionable. Always mention that past performance doesn't guarantee future results when giving specific advice. Use data when available but be clear about limitations.`
      },
      // Include recent history if provided (last 10 messages)
      ...(history || []).slice(-10).map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: message + stockContext
      }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('OpenAI API error:', data.error);
      return NextResponse.json(
        { error: data.error.message || 'AI service error' },
        { status: 500 }
      );
    }

    const reply = data.choices?.[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.';

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('AI chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
