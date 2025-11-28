import { NextResponse } from "next/server";

interface ModuleItem {
  id: string;
  title: string;
  description: string;
  link: string;
}

export async function GET() {
  try {
    // Example modules — replace with your real content list
    const modules: ModuleItem[] = [
      {
        id: "1",
        title: "Business Model & Lean Canvas",
        description: "Understand your value proposition, customer segments, revenue model and structure your startup with a lean approach.",
        link: "/resources/business-entrepreneurship/startup-fundamentals/business-model"
      },
      {
        id: "2",
        title: "Market Research & Customer Discovery",
        description: "Learn how to validate your market, identify your ideal customer and test your assumptions before scaling.",
        link: "/resources/business-entrepreneurship/startup-fundamentals/market-discovery"
      },
      {
        id: "3",
        title: "Financing & Fundraising Fundamentals",
        description: "Explore funding options from bootstrapping to venture capital, how to pitch investors and raise your seed round.",
        link: "/resources/business-entrepreneurship/startup-fundamentals/fundraising"
      },
      {
        id: "4",
        title: "Operations & Scaling Strategy",
        description: "Build your operating model, set up quality standards like ISO 9001, streamline processes and plan for growth.",
        link: "/resources/business-entrepreneurship/startup-fundamentals/operations-scaling"
      }
      // Add more modules as needed
    ];

    return NextResponse.json(modules);
  } catch (err) {
    console.error("Startup Fundamentals API Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch startup fundamentals modules" },
      { status: 500 }
    );
  }
}
