import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { type, query } = await req.json();
    let url = "";

    switch (type) {
      case "stocks":
        url = `https://financialmodelingprep.com/api/v3/stock-screener?limit=50&exchange=NASDAQ&apikey=${process.env.FMP_API_KEY}`;
        break;
      case "etf":
        url = `https://financialmodelingprep.com/api/v3/etf/list?apikey=${process.env.FMP_API_KEY}`;
        break;
      case "crypto":
        url = `https://financialmodelingprep.com/api/v3/available-cryptocurrencies?apikey=${process.env.FMP_API_KEY}`;
        break;
      case "forex":
        url = `https://financialmodelingprep.com/api/v3/forex?apikey=${process.env.FMP_API_KEY}`;
        break;
      case "bonds":
        url = `https://financialmodelingprep.com/api/v4/government_bonds_yield?apikey=${process.env.FMP_API_KEY}`;
        break;
      default:
        url = `https://financialmodelingprep.com/api/v3/stock-screener?limit=50&apikey=${process.env.FMP_API_KEY}`;
    }

    if (query && type === "stocks") {
      url = `https://financialmodelingprep.com/api/v3/stock-screener?exchange=NASDAQ&limit=50&ticker=${encodeURIComponent(
        query
      )}&apikey=${process.env.FMP_API_KEY}`;
    }

    const res = await fetch(url);
    const data = await res.json();
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Screener API error:", error);
    return NextResponse.json({ data: [] }, { status: 500 });
  }
}
