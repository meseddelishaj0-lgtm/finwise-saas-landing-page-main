import { NextResponse } from "next/server";

export async function GET() {
  try {
    const fmp_api_key = process.env.FMP_API_KEY;
    const url = `https://financialmodelingprep.com/stable/treasury-rates?apikey=${fmp_api_key}`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`Failed to fetch treasury rates: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json({ treasuryRates: data, lastUpdated: new Date().toISOString() });
  } catch (error: any) {
    console.error("Error fetching treasury rates:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
