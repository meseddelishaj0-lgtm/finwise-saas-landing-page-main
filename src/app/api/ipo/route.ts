import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiKey = process.env.FMP_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing FMP_API_KEY in environment variables" },
        { status: 500 }
      );
    }

    // FMP Ultimate API endpoints for IPOs
    const upcomingUrl = `https://financialmodelingprep.com/api/v3/ipo_calendar?apikey=${apiKey}`;
    const recentUrl = `https://financialmodelingprep.com/api/v3/ipo?apikey=${apiKey}`;

    // Fetch both recent & upcoming in parallel
    const [upcomingRes, recentRes] = await Promise.all([
      fetch(upcomingUrl),
      fetch(recentUrl),
    ]);

    const [upcomingData, recentData] = await Promise.all([
      upcomingRes.json(),
      recentRes.json(),
    ]);

    // Combine and normalize data
    const ipos = [
      ...(Array.isArray(recentData) ? recentData : []),
      ...(Array.isArray(upcomingData) ? upcomingData : []),
    ].map((item: any) => ({
      symbol: item.symbol || item.ticker || "N/A",
      name: item.name || item.company || "Unknown",
      date: item.date || item.ipoDate || "N/A",
      price: item.price || item.priceRange || "N/A",
      exchange: item.exchange || "—",
      status:
        item.status?.toLowerCase() ||
        (new Date(item.ipoDate || item.date) > new Date()
          ? "upcoming"
          : "priced"),
    }));

    return NextResponse.json(ipos);
  } catch (err) {
    console.error("IPO API Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch IPO data" },
      { status: 500 }
    );
  }
}
