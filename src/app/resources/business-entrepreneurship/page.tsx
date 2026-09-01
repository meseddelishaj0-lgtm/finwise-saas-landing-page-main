"use client";

import React from "react";
import Link from "next/link";
import { Briefcase, Rocket, Users, LineChart, Lightbulb, Target } from "lucide-react";

export default function BusinessEntrepreneurshipPage() {
  const topics = [
    {
      title: "Startup Fundamentals",
      icon: <Rocket className="w-6 h-6 text-gold" />,
      description:
        "Learn how to turn ideas into scalable startups — covering business models, product-market fit, and lean methodologies.",
      href: "/resources/business-entrepreneurship/startup-fundamentals",
    },
    {
      title: "Business Planning",
      icon: <Briefcase className="w-6 h-6 text-gold" />,
      description:
        "Create powerful business plans and financial projections that attract investors and support long-term growth.",
      href: "/resources/business-entrepreneurship/business-planning",
    },
    {
      title: "Leadership & Management",
      icon: <Users className="w-6 h-6 text-gold" />,
      description:
        "Develop essential leadership skills for team building, communication, and organizational culture that drives success.",
      href: "/resources/business-entrepreneurship/leadership-management",
    },
    {
      title: "Marketing & Growth",
      icon: <LineChart className="w-6 h-6 text-gold" />,
      description:
        "Master modern marketing — from branding and digital advertising to customer acquisition and retention strategies.",
      href: "/resources/business-entrepreneurship/marketing-growth",
    },
    {
      title: "Innovation & Strategy",
      icon: <Lightbulb className="w-6 h-6 text-gold" />,
      description:
        "Explore competitive strategy, business innovation, and disruptive thinking frameworks used by world-class companies.",
      href: "/resources/business-entrepreneurship/innovation-strategy",
    },
    {
      title: "Entrepreneurship Mindset",
      icon: <Target className="w-6 h-6 text-gold" />,
      description:
        "Build resilience, decision-making, and visionary thinking to lead in uncertain markets and turn challenges into opportunities.",
      href: "/resources/business-entrepreneurship/entrepreneurship-mindset",
    },
  ];

  return (
    <section className="min-h-screen bg-night px-6 pt-10 md:pt-12 pb-20">
      <div className="max-w-6xl mx-auto text-center">
        <h1 className="text-4xl mb-6 text-ivory font-display font-normal tracking-tight md:text-5xl">
          Business & Entrepreneurship
        </h1>
        <p className="text-lg text-gray-400 mb-12">
          Explore modern business strategies, startup frameworks, and leadership tools designed
          to help you build, scale, and manage successful ventures in today’s competitive economy.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
          {topics.map((topic) => (
            <Link
              key={topic.title}
              href={topic.href}
              className="p-6 rounded-2xl border shadow-sm hover:shadow-md transition bg-surface2 hover:bg-surface2 block"
            >
              <div className="flex items-center mb-3 space-x-3">
                {topic.icon}
                <h3 className="text-xl font-semibold text-ivory">{topic.title}</h3>
              </div>
              <p className="text-gray-400">{topic.description}</p>
            </Link>
          ))}
        </div>

        <div className="mt-16 max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4 text-gray-100">Coming Soon</h2>
          <p className="text-gray-400">
            Case studies, AI business planners, and real-world startup simulation tools are in
            development to enhance your entrepreneurial learning experience.
          </p>
        </div>

        <div className="mt-12">
          <Link
            href="/resources"
            className="inline-block mt-8 text-gold hover:text-indigo-800 font-semibold transition"
          >
            ← Back to Resources
          </Link>
        </div>
      </div>
    </section>
  );
}
