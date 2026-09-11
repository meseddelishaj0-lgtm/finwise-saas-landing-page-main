import { NextResponse } from "next/server";
import {
  getEarningsCalendar,
  getDividendsCalendar,
  getSplitsCalendar,
} from "@/lib/twelvedata";
import { fmp } from "@/lib/fmp";

export const runtime = "nodejs";

// Earnings / dividends / splits calendars from Twelve Data. The economic
// calendar (macro releases, which Twelve Data does not carry) comes from FMP.

const iso = (d: Date) => d.toISOString().slice(0, 10);

export async function POST(req: Request) {
  try {
    const { type } = await req.json();

    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 30);

    switch (type) {
      case "dividends": {
        const rows = await getDividendsCalendar(iso(from), iso(to));
        return NextResponse.json({ data: rows.slice(0, 60) });
      }
      case "splits": {
        const rows = await getSplitsCalendar(iso(from), iso(to));
        return NextResponse.json({ data: rows.slice(0, 60) });
      }
      case "economy": {
        const rows = await fmp<Record<string, unknown>[]>(
          "v3/economic_calendar",
          { from: iso(from), to: iso(to) },
          30 * 60_000
        );
        // FMP lists the furthest date first; show the soonest releases first.
        const data = (Array.isArray(rows) ? rows : [])
          .slice()
          .sort((a, b) => String(a.date).localeCompare(String(b.date)));
        return NextResponse.json({ data });
      }
      case "earnings":
      default: {
        const rows = await getEarningsCalendar(iso(from), iso(to));
        return NextResponse.json({ data: rows.slice(0, 60) });
      }
    }
  } catch (error) {
    console.error("Calendar API error:", error);
    return NextResponse.json({ data: [] }, { status: 502 });
  }
}
