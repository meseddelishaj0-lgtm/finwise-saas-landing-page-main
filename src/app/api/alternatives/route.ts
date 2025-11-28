import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { type } = await req.json();

    let endpoint = "";

    switch (type) {
      case "commodities":
        endpoint = "quotes/commodity";
        break;
      case "reits":
        endpoint = "etf/list"; // REITs are often ETFs on FMP
        break;
      case "private_equity":
        endpoint = "etf/list"; // Placeholder – private equity proxies
        break;
      case "hedge_funds":
        endpoint = "quotes/index"; // Index-based hedge fund proxies
        break;
      default:
        endpoint = "quotes/commodity";
    }

    const url = `https://financialmodelingprep.com/api/v3/${endpoint}?apikey=${process.env.FMP_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Alternatives API error:", error);
    return NextResponse.json({ data: [] }, { status: 500 });
  }
}
