import React from "react";
import Link from "next/link";
import { Briefcase, Rocket, Users, LineChart, Lightbulb, Target } from "lucide-react";
import CommandLine from "@/components/ui/CommandLine";
import Reveal from "@/components/ui/Reveal";

const TOPICS = [
  {
    title: "Startup fundamentals",
    icon: Rocket,
    description:
      "Turning an idea into a scalable startup: business models, product-market fit, and lean methods.",
    href: "/resources/business-entrepreneurship/startup-fundamentals",
  },
  {
    title: "Business planning",
    icon: Briefcase,
    description:
      "Business plans and financial projections that hold up in front of investors and support long-term growth.",
    href: "/resources/business-entrepreneurship/business-planning",
  },
  {
    title: "Leadership & management",
    icon: Users,
    description:
      "Team building, communication, and the organizational culture that makes a company work.",
    href: "/resources/business-entrepreneurship/leadership-management",
  },
  {
    title: "Marketing & growth",
    icon: LineChart,
    description:
      "Branding, digital advertising, and customer acquisition and retention.",
    href: "/resources/business-entrepreneurship/marketing-growth",
  },
  {
    title: "Innovation & strategy",
    icon: Lightbulb,
    description:
      "Competitive strategy, business innovation, and the disruptive-thinking frameworks used by leading companies.",
    href: "/resources/business-entrepreneurship/innovation-strategy",
  },
  {
    title: "Entrepreneurship mindset",
    icon: Target,
    description:
      "Resilience, decision-making, and the long view needed to lead through uncertain markets.",
    href: "/resources/business-entrepreneurship/entrepreneurship-mindset",
  },
];

export default function BusinessEntrepreneurshipPage() {
  return (
    <main className="min-h-screen bg-night text-ivory">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-14 md:py-20">
        <Reveal>
          <CommandLine cmd="BIZ" note="business and entrepreneurship" className="mb-4" />
          <h1 className="font-display text-ivory text-4xl md:text-6xl tracking-tight max-w-3xl">
            Business &amp; <em className="italic text-gold-soft">entrepreneurship</em>.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-gray-400 leading-relaxed">
            Business strategy, startup frameworks, and leadership tools for building, scaling,
            and running a venture in a competitive economy.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {TOPICS.map((topic, i) => {
            const Icon = topic.icon;
            return (
              <Reveal key={topic.href} delay={i * 0.06} className="h-full">
                <Link href={topic.href} className="card-night card-hover group flex h-full flex-col p-6">
                  <Icon className="h-6 w-6 text-gold" aria-hidden="true" />
                  <h2 className="mt-5 text-lg md:text-xl font-semibold text-ivory">{topic.title}</h2>
                  <p className="mt-2 flex-1 text-gray-400 leading-relaxed">{topic.description}</p>
                  <span className="mt-6 font-monodata text-[11px] uppercase tracking-widest text-gold-soft">
                    Open modules <span className="arrow">→</span>
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </div>

        <Reveal className="mt-14">
          <Link href="/resources" className="btn-ghost-gold px-5 py-2.5 text-sm">
            ← Back to library
          </Link>
        </Reveal>
      </div>
    </main>
  );
}
