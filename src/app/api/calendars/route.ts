import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { type } = await req.json();

    let endpoint = "";
    switch (type) {
      case "earnings":
        endpoint = "earning_calendar?limit=30";
        break;
      case "dividends":
        endpoint = "stock_dividend_calendar?limit=30";
        break;
      case "economy":
        endpoint = "economic_calendar?limit=30";
        break;
      default:
        endpoint = "earning_calendar?limit=30";
    }

    const url = `https://financialmodelingprep.com/api/v3/${endpoint}&apikey=${process.env.FMP_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Calendar API error:", error);
    return NextResponse.json({ data: [] }, { status: 500 });
  }
}
