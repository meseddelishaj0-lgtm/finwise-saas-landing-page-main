import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const url = `https://financialmodelingprep.com/api/v3/stock-screener?marketCapMoreThan=50&limit=10000&country=US&apikey=${process.env.FMP_API_KEY}`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Market Screener Error:", error);
    return NextResponse.json({ error: "Failed to load market data" }, { status: 500 });
  }
}
