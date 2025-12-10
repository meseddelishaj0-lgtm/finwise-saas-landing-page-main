// app/api/global/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch(
      `https://financialmodelingprep.com/api/v3/quotes/index?apikey=${process.env.FMP_API_KEY}`,
      { next: { revalidate: 60 } } // cache for 1 minute
    );

    if (!res.ok) throw new Error("Failed to fetch data from FMP API");

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error fetching global market data:", error);
    return NextResponse.json(
      { error: "Failed to load global market data" },
      { status: 500 }
    );
  }
}
