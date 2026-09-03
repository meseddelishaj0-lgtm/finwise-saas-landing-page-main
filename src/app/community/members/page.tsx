"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import CommandLine from "@/components/ui/CommandLine";
import Reveal from "@/components/ui/Reveal";

export default function MemberNetworkPage() {
  const router = useRouter();

  const members = [
    {
      name: "Professional investors",
      description:
        "Connect with experienced portfolio managers, analysts, and traders to exchange professional insights.",
      link: "/community/members/investors",
    },
    {
      name: "AI and data analysts",
      description:
        "Collaborate with AI engineers and data scientists using models to forecast trends and evaluate stocks.",
      link: "/community/members/analysts",
    },
    {
      name: "Finance students and learners",
      description:
        "Join a learning community of finance students and aspiring analysts to grow your market knowledge.",
      link: "/community/members/students",
    },
    {
      name: "Networking events",
      description:
        "Access exclusive online meetups, webinars, and collaboration sessions to expand your professional network.",
      link: "/community/members/events",
    },
  ];

  return (
    <main className="min-h-screen bg-night text-ivory">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-14 md:py-20">
        <Reveal>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <CommandLine cmd="MEM" note="the member network" className="mb-4" />
              <h1 className="font-display text-ivory text-4xl md:text-6xl tracking-tight">
                Member <em className="italic text-gold-soft">network</em>.
              </h1>
              <p className="mt-5 text-lg text-gray-300 max-w-2xl">
                Investors, analysts, and learners who share research and build
                a reputation on the same desk.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/community")}
              className="btn-ghost-gold px-4 py-2 text-sm shrink-0 self-start md:self-auto"
            >
              Back to community
            </button>
          </div>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {members.map((member, i) => (
            <Reveal key={member.name} delay={0.06 + i * 0.06} className="h-full">
              <Link
                href={member.link}
                className="group card-night card-hover p-6 md:p-8 flex flex-col h-full"
              >
                <h2 className="text-lg md:text-xl font-semibold text-ivory">{member.name}</h2>
                <p className="mt-3 text-gray-400 leading-relaxed flex-1">{member.description}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-gold-soft">
                  Open group <span className="arrow">→</span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.3} className="mt-14 pt-8 border-t border-white/10">
          <button
            type="button"
            onClick={() => router.push("/community")}
            className="btn-ghost-gold px-4 py-2 text-sm"
          >
            Back to community hub
          </button>
        </Reveal>
      </div>
    </main>
  );
}
