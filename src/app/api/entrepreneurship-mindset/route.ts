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
        id: "em-1",
        title: "Growth Mindset for Entrepreneurs",
        description: "Adopt a mindset oriented around growth, resilience, and lifelong learning — essential for founders and change makers.",
        link: "/resources/business-entrepreneurship/entrepreneurship-mindset/growth-mindset"
      },
      {
        id: "em-2",
        title: "Failure, Resilience & Pivoting",
        description: "Understand how to handle setbacks, build resilience and pivot successfully when plans don’t go as expected.",
        link: "/resources/business-entrepreneurship/entrepreneurship-mindset/failure-resilience"
      },
      {
        id: "em-3",
        title: "Self-Leadership & Productivity",
        description: "Master your personal productivity, decision-making and leadership habits to drive your startup forward.",
        link: "/resources/business-entrepreneurship/entrepreneurship-mindset/self-leadership"
      },
      {
        id: "em-4",
        title: "Innovation Mindset & Creativity",
        description: "Unlock creative thinking and innovation mindset frameworks that help you generate breakthrough ideas and business models.",
        link: "/resources/business-entrepreneurship/entrepreneurship-mindset/innovation-mindset"
      },
      {
        id: "em-5",
        title: "Mindset Metrics & Growth Tracker",
        description: "Measure your mindset progress, set key performance indicators (KPIs) for personal growth and track your entrepreneurial journey.",
        link: "/resources/business-entrepreneurship/entrepreneurship-mindset/mindset-metrics"
      }
    ];

    return NextResponse.json(modules);
  } catch (err) {
    console.error("Entrepreneurship Mindset API Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch entrepreneurship-mindset modules" },
      { status: 500 }
    );
  }
}
