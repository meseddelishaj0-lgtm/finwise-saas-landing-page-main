import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiKey = process.env.FMP_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing FMP_API_KEY" },
        { status: 500 }
      );
    }

    // ✅ Fetch Volatility Index (VIX) & S&P 500 data
    const [vixRes, spRes] = await Promise.all([
      fetch(`https://financialmodelingprep.com/api/v3/historical-price-full/%5EVIX?timeseries=90&apikey=${apiKey}`),
      fetch(`https://financialmodelingprep.com/api/v3/historical-price-full/%5EGSPC?timeseries=90&apikey=${apiKey}`),
    ]);

    if (!vixRes.ok || !spRes.ok) {
      throw new Error("Failed to fetch market data from FMP");
    }

    const vixData = await vixRes.json();
    const spData = await spRes.json();

    const vix = vixData?.historical || [];
    const sp = spData?.historical || [];

    // ✅ Compute daily returns, drawdown, and mock VaR
    const results = sp.map((day: any, i: number) => {
      const price = day.close;
      const prev = sp[i + 1]?.close || price;
      const ret = (price - prev) / prev;
      const drawdown =
        ((price - Math.max(...sp.slice(i).map((x: any) => x.close))) /
          Math.max(...sp.slice(i).map((x: any) => x.close))) * 100;
      const var95 = (ret < 0 ? ret : 0) * 1.65 * 100; // simple approx

      return {
        date: day.date,
        volatilityIndex: vix[i]?.close || null,
        valueAtRisk: var95,
        drawdown: drawdown,
      };
    }).reverse();

    return NextResponse.json(results);
  } catch (err) {
    console.error("Risk & Volatility API Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch risk and volatility data" },
      { status: 500 }
    );
  }
}
