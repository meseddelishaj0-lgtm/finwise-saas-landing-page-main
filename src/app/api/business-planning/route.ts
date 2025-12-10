import { NextResponse } from "next/server";

interface ModuleItem {
  id: string;
  title: string;
  description: string;
  link: string;
}

export async function GET() {
  try {
    // Example module list — you can expand or replace with your own content
    const modules: ModuleItem[] = [
      {
        id: "bp-1",
        title: "Executive Summary & Vision",
        description: "Craft a compelling executive summary that captures your mission, value proposition, and what makes your startup unique.",
        link: "/resources/business-entrepreneurship/business-planning/executive-summary"
      },
      {
        id: "bp-2",
        title: "Market Analysis & Competitive Landscape",
        description: "Learn how to research your market size, identify customer segments and map your competitor environment effectively.",
        link: "/resources/business-entrepreneurship/business-planning/market-analysis"
      },
      {
        id: "bp-3",
        title: "Business Model & Revenue Streams",
        description: "Define your business model, pricing strategy, and revenue streams — the backbone of your startup’s financial plan.",
        link: "/resources/business-entrepreneurship/business-planning/business-model"
      },
      {
        id: "bp-4",
        title: "Operations, Team & Scaling Strategy",
        description: "Setup your operational plan, build your founding team structure, and define how you will scale efficiently and sustainably.",
        link: "/resources/business-entrepreneurship/business-planning/operations-scaling"
      },
      {
        id: "bp-5",
        title: "Financial Plan & Funding Strategy",
        description: "Develop your financial projections, budget needs and funding strategy — how you will raise capital and manage resources.",
        link: "/resources/business-entrepreneurship/business-planning/financial-plan"
      }
    ];

    return NextResponse.json(modules);
  } catch (err) {
    console.error("Business Planning API Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch business planning modules" },
      { status: 500 }
    );
  }
}
