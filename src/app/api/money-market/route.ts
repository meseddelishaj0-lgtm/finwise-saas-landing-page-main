import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiKey = process.env.FRED_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing FRED_API_KEY in environment variables" },
        { status: 500 }
      );
    }

    // ✅ List of all Fed series IDs we’ll pull
    const series = {
      DGS1MO: "1-Month Treasury",
      DGS3MO: "3-Month Treasury",
      DGS6MO: "6-Month Treasury",
      DGS1: "1-Year Treasury",
      DGS2: "2-Year Treasury",
      DGS5: "5-Year Treasury",
      DGS10: "10-Year Treasury",
      DGS30: "30-Year Treasury",
      RRPONTSYD: "Overnight Reverse Repo",
      CD3M: "3-Month Certificate of Deposit",
      FEDFUNDS: "Federal Funds Rate",
    };

    // Fetch all series in parallel
    const responses = await Promise.all(
      Object.keys(series).map((id) =>
        fetch(
          `https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${apiKey}&file_type=json`
        ).then((r) => r.json())
      )
    );

    // Normalize the data into an object by series name
    const results: Record<string, { date: string; value: number }[]> = {};
    Object.entries(series).forEach(([id, name], i) => {
      const obs = responses[i]?.observations || [];
      results[name] = obs
        .slice(-60) // last 60 days
        .map((o: any) => ({
          date: o.date,
          value: parseFloat(o.value),
        }))
        .filter((d: { value: number; }): d is { date: string; value: number } => !isNaN(d.value));
    });

    // Return everything together
    return NextResponse.json(results);
  } catch (err) {
    console.error("Money Market API Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch Fed data" },
      { status: 500 }
    );
  }
}
