// src/app/api/ai/chat/route.ts
// AI Chat endpoint for the mobile app assistant
import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/rateLimit';
import { getQuote, isProxiedIndex } from '@/lib/twelvedata';
import { getQuoteStats } from '@/lib/fmp';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Attach live market data when the user names a ticker. Price and trading
// fields come from Twelve Data's quote; market cap and P/E from FMP.
async function getStockContext(message: string): Promise<string> {
  const tickerMatch = message.toUpperCase().match(/\$?([A-Z]{1,5})\b/);
  if (!tickerMatch) return '';

  try {
    // A bare index name ("VIX", "SPX") means the index, quoted at its real level.
    const named = tickerMatch[1];
    const symbol = isProxiedIndex(`^${named}`) ? `^${named}` : named;

    const [q, statsBySymbol] = await Promise.all([getQuote(symbol), getQuoteStats([symbol])]);
    if (!q || !q.price) return '';
    const stats = statsBySymbol[symbol];

    const lines = [
      `- Price: $${q.price.toFixed(2)}`,
      `- Change: ${q.change >= 0 ? '+' : ''}${q.change.toFixed(2)} (${q.changesPercentage.toFixed(2)}%)`,
    ];
    if (stats?.marketCap) lines.push(`- Market Cap: $${(stats.marketCap / 1e9).toFixed(2)}B`);
    if (stats?.pe) lines.push(`- P/E Ratio: ${stats.pe.toFixed(2)}`);
    if (q.yearHigh) lines.push(`- 52-Week High: $${q.yearHigh.toFixed(2)}`);
    if (q.yearLow) lines.push(`- 52-Week Low: $${q.yearLow.toFixed(2)}`);
    if (q.volume) lines.push(`- Volume: ${(q.volume / 1e6).toFixed(2)}M`);

    return `\n\n[Current market data for ${q.symbol} (${q.name}):\n${lines.join('\n')}]`;
  } catch (e) {
    console.error('Error fetching stock data:', e);
  }
  return '';
}

export async function POST(req: NextRequest) {
  const _rl = enforceRateLimit(req, 'ai', 15, 60_000);
  if (_rl) return _rl;
  try {
    const { message, history } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
    if (message.length > 4000) {
      return NextResponse.json({ error: 'Message too long' }, { status: 400 });
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
      // Include recent history if provided (last 10 messages). Only allow
      // user/assistant roles — a client-supplied role:'system' would let a
      // caller inject instructions past our system prompt (prompt injection).
      ...(Array.isArray(history) ? history : [])
        .slice(-10)
        .filter((msg: any) => msg && (msg.role === 'user' || msg.role === 'assistant') && typeof msg.content === 'string')
        .map((msg: any) => ({ role: msg.role, content: String(msg.content).slice(0, 4000) })),
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
      return NextResponse.json({ error: 'AI service error' }, { status: 502 });
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
