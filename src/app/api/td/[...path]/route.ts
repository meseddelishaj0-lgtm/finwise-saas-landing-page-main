// src/app/api/td/[...path]/route.ts
// Transparent proxy for Twelve Data so the app doesn't ship the TD key. Client
// calls /api/td/<same path as TD> (e.g. /api/td/quote?symbol=AAPL); we forward
// to api.twelvedata.com with the server-only TWELVE_DATA_API_KEY. (Real-time
// streaming uses a separate WS server, not this key.)
import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/rateLimit';

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const limited = enforceRateLimit(req, 'td', 600, 60_000);
  if (limited) return limited;

  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Data source not configured' }, { status: 503 });

  const path = (params.path || []).join('/');
  const upstream = new URL(`https://api.twelvedata.com/${path}`);
  req.nextUrl.searchParams.forEach((v, k) => {
    if (k.toLowerCase() !== 'apikey') upstream.searchParams.set(k, v);
  });
  upstream.searchParams.set('apikey', apiKey);

  try {
    const res = await fetch(upstream.toString(), { headers: { Accept: 'application/json' } });
    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('content-type') || 'application/json',
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
      },
    });
  } catch (err) {
    console.error('td proxy error:', err);
    return NextResponse.json({ error: 'Upstream request failed' }, { status: 502 });
  }
}
