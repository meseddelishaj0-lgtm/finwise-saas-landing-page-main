import { NextResponse } from "next/server";

interface Report {
  id: string;
  title: string;
  date: string;
  url: string;
  summary: string;
}

export async function GET() {
  try {
    // Example data — replace with your real reports source (DB, S3, CMS, etc.)
    const reports: Report[] = [
      {
        id: "2025-Q3",
        title: "WallStreetStocks Q3 2025 Performance Report",
        date: "2025-10-30",
        url: "/reports/WSS_Q3_2025.pdf",
        summary: "Highlights strategy performance, Sharpe ratio, drawdowns, and market commentary for Q3 2025."
      },
      {
        id: "2025-Q2",
        title: "WallStreetStocks Q2 2025 Performance Report",
        date: "2025-07-30",
        url: "/reports/WSS_Q2_2025.pdf",
        summary: "Breakdown of returns vs benchmark, sector allocations, and risk metrics for Q2 2025."
      },
      // add more reports as needed
    ];

    return NextResponse.json(reports);
  } catch (err) {
    console.error("Performance Reports API Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch performance reports" },
      { status: 500 }
    );
  }
}
