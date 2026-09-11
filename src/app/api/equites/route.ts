import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Legacy alias (note the original spelling). Nothing on the site consumes it;
// it forwards to the maintained screener dataset so any stray caller still
// gets valid Twelve Data-backed rows.
export async function GET(request: Request) {
  const url = new URL("/api/market/screener", request.url);
  try {
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Equities alias error:", error);
    return NextResponse.json({ error: "Failed to load market data" }, { status: 500 });
  }
}
