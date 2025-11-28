import { NextResponse } from "next/server";

export async function GET() {
  try {
    const fmp_api_key = process.env.FMP_API_KEY;
    if (!fmp_api_key) {
      return NextResponse.json(
        { error: "Missing FMP_API_KEY in environment variables" },
        { status: 500 }
      );
    }

    // ✅ Fetch most active ETFs
    const url = `https://financialmodelingprep.com/api/v3/etf/list?apikey=${fmp_api_key}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!Array.isArray(data)) {
      return NextResponse.json({ error: "Invalid ETF data format" }, { status: 500 });
    }

    // ✅ Example formatting — only take first 20 ETFs
    const etfs = data.slice(0, 20).map((etf: any) => ({
      symbol: etf.symbol,
      name: etf.name || "N/A",
      price: etf.price || 0,
      change: etf.change || 0,
      changesPercentage: etf.changesPercentage || 0,
      volume: etf.volume || 0,
      avgVolume: etf.avgVolume || 0,
      ytdReturn: etf.ytdReturn || 0,
      threeMonthReturn: etf.threeMonthReturn || 0,
      fiftyTwoWeekChange: etf.fiftyTwoWeekChange || 0,
    }));

    return NextResponse.json(etfs);
  } catch (error) {
    console.error("ETF route error:", error);
    return NextResponse.json({ error: "Failed to fetch ETF data" }, { status: 500 });
  }
}
