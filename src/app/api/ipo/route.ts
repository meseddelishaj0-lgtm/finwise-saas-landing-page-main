import { NextResponse } from "next/server";
import { getIpoCalendar } from "@/lib/twelvedata";

export const dynamic = "force-dynamic";

// IPO calendar from Twelve Data's ipo_calendar, which covers both priced and
// upcoming offerings in one feed. Shape matches what the page already renders.
export async function GET() {
  try {
    const events = await getIpoCalendar();
    const today = new Date().toISOString().slice(0, 10);

    const ipos = events.map((e) => {
      const range =
        e.offerPrice != null
          ? `$${e.offerPrice}`
          : e.priceRangeLow != null && e.priceRangeHigh != null
          ? `$${e.priceRangeLow}–$${e.priceRangeHigh}`
          : "N/A";

      return {
        symbol: e.symbol || "N/A",
        name: e.name || e.symbol || "Unknown",
        date: e.date || "N/A",
        price: range,
        shares: e.shares,
        exchange: e.exchange || "—",
        status: e.date > today ? "upcoming" : "priced",
      };
    });

    return NextResponse.json(ipos, {
      headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" },
    });
  } catch (err) {
    console.error("IPO API Error:", err);
    return NextResponse.json({ error: "Failed to fetch IPO data" }, { status: 502 });
  }
}
