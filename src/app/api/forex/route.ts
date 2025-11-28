import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  try {
    const url = `https://financialmodelingprep.com/api/v3/quotes/forex?apikey=${process.env.FMP_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Forex API error:", error);
    return NextResponse.json({ data: [] }, { status: 500 });
  }
}
