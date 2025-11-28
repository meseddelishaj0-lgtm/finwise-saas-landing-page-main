import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch(
      `https://financialmodelingprep.com/stable/mergers-acquisitions-latest?page=0&limit=100&apikey=${process.env.FMP_API_KEY}`,
      { cache: "no-store" }
    );
    if (!res.ok) throw new Error("FMP API error");
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("FMP route error:", error);
    return NextResponse.json({ error: "Failed to load M&A data" }, { status: 500 });
  }
}
