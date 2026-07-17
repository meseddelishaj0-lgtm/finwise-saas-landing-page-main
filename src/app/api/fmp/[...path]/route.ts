// src/app/api/fmp/[...path]/route.ts
// Transparent proxy for Financial Modeling Prep so the app doesn't ship the FMP
// key. The client calls /api/fmp/<same path as FMP> (e.g. /api/fmp/api/v3/quote/
// AAPL); we forward to financialmodelingprep.com with the server-only
// FMP_API_KEY. Any client-supplied apikey is stripped. Short edge-cache reduces
// latency + duplicate upstream calls. Rate-limited per IP to bound quota abuse.
import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/rateLimit';

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const limited = enforceRateLimit(req, 'fmp', 600, 60_000);
  if (limited) return limited;

  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Data source not configured' }, { status: 503 });

  const path = (params.path || []).join('/');
  const upstream = new URL(`https://financialmodelingprep.com/${path}`);
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
    console.error('fmp proxy error:', err);
    return NextResponse.json({ error: 'Upstream request failed' }, { status: 502 });
  }
}
