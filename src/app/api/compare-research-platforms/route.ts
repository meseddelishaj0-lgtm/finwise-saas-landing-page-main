import { NextResponse } from "next/server";

interface PlatformComparison {
  name: string;
  features: string[];
  pricing: string;
  bestFor: string;
  pros: string;
  cons: string;
}

export async function GET() {
  try {
    // Example data — replace with your real comparisons
    const comparisons: PlatformComparison[] = [
      {
        name: "Platform A",
        features: ["Real-time data", "AI summarization", "Collaboration tools"],
        pricing: "From $49/mo",
        bestFor: "Small teams, startup analysts",
        pros: "Very easy to use, low cost",
        cons: "Limited historical data"
      },
      {
        name: "Platform B",
        features: ["Deep backtesting", "Risk analytics", "Portfolio simulation"],
        pricing: "From $299/mo",
        bestFor: "Professional asset managers",
        pros: "Rich analytics, institutional grade",
        cons: "Steep learning curve, high cost"
      },
      {
        name: "Platform C",
        features: ["Custom alerts", "Data export API", "White-label reports"],
        pricing: "From $149/mo",
        bestFor: "RIAs & advisors",
        pros: "Good balance of features/cost",
        cons: "Interface not as slick"
      }
      // Add more entries as needed
    ];

    return NextResponse.json(comparisons);
  } catch (err) {
    console.error("Compare Research Platforms API Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch platform comparison data" },
      { status: 500 }
    );
  }
}
