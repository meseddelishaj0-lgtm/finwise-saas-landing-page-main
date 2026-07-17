import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// Server-side proxy for Finnhub.
// Injects the SERVER-side FINNHUB_API_KEY so the key never ships in the browser bundle.
// Client calls e.g. /api/proxy/finnhub/api/v1/quote?symbol=AAPL  ->  https://finnhub.io/api/v1/quote?symbol=AAPL&token=KEY
export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const limited = enforceRateLimit(req, "proxy-finnhub", 60, 60_000);
  if (limited) return limited;

  try {
    const path = (params.path || []).join("/");
    const incoming = req.nextUrl.searchParams;
    const qs = new URLSearchParams(incoming);
    qs.delete("token"); // never trust a client-supplied token
    qs.set("token", process.env.FINNHUB_API_KEY || "");

    const url = `https://finnhub.io/${path}?${qs.toString()}`;
    const upstream = await fetch(url, { cache: "no-store" });

    let data: unknown;
    try {
      data = await upstream.json();
    } catch {
      data = { error: "Upstream returned a non-JSON response" };
    }

    return NextResponse.json(data, {
      status: upstream.status,
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Proxy request failed" },
      { status: 500 }
    );
  }
}
