import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { type } = await req.json();

    let endpoint = "";

    switch (type) {
      case "futures":
        endpoint = "quotes/commodity"; // Commodity futures data
        break;
      case "options":
        endpoint = "etf/list"; // Placeholder – can be replaced with specific options endpoint if needed
        break;
      case "swaps":
        endpoint = "quotes/credit"; // Credit derivatives (CDS)
        break;
      case "forwards":
        endpoint = "quotes/forex"; // FX forwards
        break;
      default:
        endpoint = "quotes/commodity";
    }

    const url = `https://financialmodelingprep.com/api/v3/${endpoint}?apikey=${process.env.FMP_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Derivatives API error:", error);
    return NextResponse.json({ data: [] }, { status: 500 });
  }
}
