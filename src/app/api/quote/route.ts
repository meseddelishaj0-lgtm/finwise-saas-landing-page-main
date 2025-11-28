import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { symbol } = await req.json();
    if (!symbol) return NextResponse.json({ data: null });

    const url = `https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(
      symbol
    )}?apikey=${process.env.FMP_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    return NextResponse.json({ data: data?.[0] || null });
  } catch (error) {
    console.error("Quote API error:", error);
    return NextResponse.json({ data: null }, { status: 500 });
  }
}
