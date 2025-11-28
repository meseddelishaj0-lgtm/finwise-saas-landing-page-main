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
        id: "lm-1",
        title: "Foundations of Leadership",
        description: "Understand core leadership styles, traits of effective leaders and how to build influence in your team or organisation.",
        link: "/resources/business-entrepreneurship/leadership-management/foundations-of-leadership"
      },
      {
        id: "lm-2",
        title: "Team Management & Motivation",
        description: "Learn how to manage diverse teams, motivate performance, and foster a culture of accountability and growth.",
        link: "/resources/business-entrepreneurship/leadership-management/team-management"
      },
      {
        id: "lm-3",
        title: "Communicating as a Leader",
        description: "Master high-impact communication: from vision delivery to one-on-one coaching and conflict resolution.",
        link: "/resources/business-entrepreneurship/leadership-management/communication"
      },
      {
        id: "lm-4",
        title: "Change, Growth & Scaling Your Leadership",
        description: "Develop your leadership to guide growth, handle change management and scale your team and leadership structure effectively.",
        link: "/resources/business-entrepreneurship/leadership-management/change-management"
      },
      {
        id: "lm-5",
        title: "Leadership Metrics & Performance",
        description: "Measure and track leadership success — key metrics, KPIs and frameworks to evaluate leadership impact.",
        link: "/resources/business-entrepreneurship/leadership-management/metrics-performance"
      }
    ];

    return NextResponse.json(modules);
  } catch (err) {
    console.error("Leadership Management API Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch leadership-management modules" },
      { status: 500 }
    );
  }
}
