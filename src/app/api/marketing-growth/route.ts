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
        id: "mg-1",
        title: "Growth Marketing Fundamentals",
        description: "Learn the core pillars of growth marketing: acquisition, activation, retention, referral and revenue.",
        link: "/resources/business-entrepreneurship/marketing-growth/growth-fundamentals"
      },
      {
        id: "mg-2",
        title: "Digital Channels & Paid Media",
        description: "Explore how to leverage paid search, social media, display ads and programmatic channels for growth.",
        link: "/resources/business-entrepreneurship/marketing-growth/digital-channels"
      },
      {
        id: "mg-3",
        title: "Content & Organic Growth Strategies",
        description: "Understand how content marketing, influencer collaborations, SEO and community building drive sustainable growth.",
        link: "/resources/business-entrepreneurship/marketing-growth/content-organic"
      },
      {
        id: "mg-4",
        title: "Data-Driven Marketing & Analytics",
        description: "Master marketing analytics: conversion funnels, cohort analysis, A/B testing and growth metrics.",
        link: "/resources/business-entrepreneurship/marketing-growth/data-analytics"
      },
      {
        id: "mg-5",
        title: "Scaling Growth & Marketing Organization",
        description: "Develop the structure, processes and frameworks to scale your growth marketing team and operations.",
        link: "/resources/business-entrepreneurship/marketing-growth/scaling-organization"
      }
    ];

    return NextResponse.json(modules);
  } catch (err) {
    console.error("Marketing Growth API Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch marketing-growth modules" },
      { status: 500 }
    );
  }
}
