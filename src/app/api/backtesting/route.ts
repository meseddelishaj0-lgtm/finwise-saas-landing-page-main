import { NextResponse } from "next/server";

// Example interface for backtest data
interface BacktestResult {
  date: string;
  strategyReturn: number;
  benchmarkReturn: number;
}

export async function GET() {
  try {
    const apiKey = process.env.FMP_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing FMP_API_KEY in environment variables" },
        { status: 500 }
      );
    }

    // Example data-fetch: historical benchmark data + your strategy results
    // For demo purposes we’ll pull benchmark (S&P500) results; you’ll replace with your own strategy data
    const benchmarkRes = await fetch(
      `https://financialmodelingprep.com/api/v3/historical-price-full/%5EGSPC?timeseries=365&apikey=${apiKey}`
    );

    if (!benchmarkRes.ok) {
      throw new Error("Failed to fetch benchmark data");
    }

    const benchmarkJson = await benchmarkRes.json();
    const benchHist: any[] = benchmarkJson.historical || [];

    // Mock strategy data: for simplicity we will assume strategy returns = benchmark returns * 1.2 (you’ll replace)
    const results: BacktestResult[] = benchHist.map((entry) => ({
      date: entry.date,
      benchmarkReturn: entry.close,
      strategyReturn: entry.close * 1.20, // placeholder multiplier
    })).reverse(); // oldest first

    return NextResponse.json(results);
  } catch (err) {
    console.error("Backtesting API Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch backtesting data" },
      { status: 500 }
    );
  }
}
