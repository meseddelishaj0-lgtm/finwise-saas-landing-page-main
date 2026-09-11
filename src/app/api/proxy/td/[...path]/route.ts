import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rateLimit";
import { TD_BASE } from "@/lib/twelvedata";

export const dynamic = "force-dynamic";

// Server-side proxy for Twelve Data.
//
// Injects the SERVER-side TWELVE_DATA_API_KEY so the key never ships in the
// browser bundle. Client calls e.g.
//   /api/proxy/td/quote?symbol=AAPL  ->  https://api.twelvedata.com/quote?symbol=AAPL&apikey=KEY
//
// Prefer a typed route under /api/market/* where one exists: those go through
// @/lib/twelvedata, which owns the credit budget, symbol translation and the
// FMP-compatible response shapes. This proxy is the escape hatch for the
// handful of endpoints that have no typed wrapper.
export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const limited = enforceRateLimit(req, "proxy-td", 60, 60_000);
  if (limited) return limited;

  try {
    const path = (params.path || []).join("/");
    const incoming = req.nextUrl.searchParams;
    const qs = new URLSearchParams(incoming);
    qs.delete("apikey"); // never trust a client-supplied key
    qs.delete("api_key");
    qs.set("apikey", process.env.TWELVE_DATA_API_KEY || "");

    const url = `${TD_BASE}/${path.replace(/^\/+/, "")}?${qs.toString()}`;
    const upstream = await fetch(url, { cache: "no-store" });

    let data: unknown;
    try {
      data = await upstream.json();
    } catch {
      data = { error: "Upstream returned a non-JSON response" };
    }

    // Twelve Data reports failures in the body with HTTP 200, so surface the
    // API-level code as the HTTP status where it looks like one.
    let status = upstream.status;
    if (
      upstream.ok &&
      data &&
      typeof data === "object" &&
      !Array.isArray(data) &&
      (data as Record<string, unknown>).status === "error"
    ) {
      const code = Number((data as Record<string, unknown>).code);
      status = code >= 400 && code <= 599 ? code : 502;
    }

    return NextResponse.json(data, {
      status,
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
