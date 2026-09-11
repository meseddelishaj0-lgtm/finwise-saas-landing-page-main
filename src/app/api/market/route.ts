import { NextResponse } from "next/server";

// Legacy alias. This used to dump a whole FMP stock-screener page; nothing on
// the site consumes it any more. It now forwards to the maintained screener
// dataset so any stray caller still gets valid data.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL("/api/market/screener", request.url);
  try {
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Market Screener Error:", error);
    return NextResponse.json({ error: "Failed to load market data" }, { status: 500 });
  }
}
