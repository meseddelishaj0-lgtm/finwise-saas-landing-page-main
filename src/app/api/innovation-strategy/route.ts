import { NextResponse } from "next/server";

interface ModuleItem {
  id: string;
  title: string;
  description: string;
  link: string;
}

export async function GET() {
  try {
    const modules: ModuleItem[] = [
      {
        id: "is-1",
        title: "Innovation Fundamentals & Frameworks",
        description: "Explore the main frameworks of innovation — disruptive innovation, open innovation, design thinking — for business growth.",
        link: "/resources/business-entrepreneurship/innovation-strategy/innovation-fundamentals"
      },
      {
        id: "is-2",
        title: "Idea Generation & Concept Development",
        description: "Learn methods to generate and refine ideas, validate concepts and build prototypes for your market.",
        link: "/resources/business-entrepreneurship/innovation-strategy/idea-generation"
      },
      {
        id: "is-3",
        title: "Innovation Pipeline & Portfolio Management",
        description: "Create and manage an innovation pipeline, rank projects, allocate resources and measure ROI on innovation initiatives.",
        link: "/resources/business-entrepreneurship/innovation-strategy/pipeline-portfolio"
      },
      {
        id: "is-4",
        title: "Scaling Innovation & Organizational Culture",
        description: "Build the culture, processes and governance needed to scale innovation within your organisation sustainably.",
        link: "/resources/business-entrepreneurship/innovation-strategy/scaling-innovation"
      },
      {
        id: "is-5",
        title: "Metrics, KPIs & Emerging Technologies",
        description: "Track innovation success with relevant KPIs, monitor emerging tech trends (AI, IoT, blockchain) and anticipate market shifts.",
        link: "/resources/business-entrepreneurship/innovation-strategy/metrics-emerging-tech"
      }
    ];

    return NextResponse.json(modules);
  } catch (err) {
    console.error("Innovation Strategy API Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch innovation-strategy modules" },
      { status: 500 }
    );
  }
}
