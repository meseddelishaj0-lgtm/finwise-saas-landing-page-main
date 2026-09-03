"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import CommandLine from "@/components/ui/CommandLine";
import Reveal from "@/components/ui/Reveal";

interface Forum {
  id: number;
  title: string;
  slug: string;
  description?: string;
}

// Forum titles in the database are prefixed with emoji; the desk has none.
const cleanTitle = (title: string) =>
  (title || "").replace(/^[\p{Extended_Pictographic}\p{Emoji_Component}️\s]+/u, "").trim() || title;

export default function ForumsPage() {
  const [forums, setForums] = useState<Forum[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchForums = async () => {
      try {
        const res = await fetch("/api/forums");
        const data = await res.json();
        setForums(data);
      } catch (error) {
        console.error("Error fetching forums:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchForums();
  }, []);

  return (
    <main className="min-h-screen bg-night text-ivory">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-14 md:py-20">
        <Reveal>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <CommandLine cmd="FOR" note="community forums" className="mb-4" />
              <h1 className="font-display text-ivory text-4xl md:text-6xl tracking-tight">
                Community <em className="italic text-gold-soft">forums</em>.
              </h1>
              <p className="mt-5 text-lg text-gray-300 max-w-2xl">
                Threads on stocks, strategies, AI forecasts, and real estate.
                Pick a board and join the conversation.
              </p>
            </div>
            <Link href="/community" className="btn-ghost-gold px-4 py-2 text-sm shrink-0 self-start md:self-auto">
              Back to community
            </Link>
          </div>
        </Reveal>

        <div className="mt-14 max-w-3xl">
          {loading ? (
            <p className="text-gray-500">Loading forums.</p>
          ) : !Array.isArray(forums) || forums.length === 0 ? (
            <p className="text-gray-500">No forums available yet.</p>
          ) : (
            <div className="space-y-4">
              {forums.map((forum, i) => (
                <Reveal key={forum.id} delay={0.06 + Math.min(i, 6) * 0.06}>
                  <Link
                    href={`/community/forums/${forum.slug}`}
                    className="group card-night card-hover p-6 flex items-start justify-between gap-6"
                  >
                    <div>
                      <h2 className="text-lg md:text-xl font-semibold text-ivory">{cleanTitle(forum.title)}</h2>
                      {forum.description && (
                        <p className="mt-2 text-gray-400 leading-relaxed">{forum.description}</p>
                      )}
                    </div>
                    <span className="mt-1 shrink-0 text-sm font-medium text-gold-soft inline-flex items-center gap-2">
                      Open <span className="arrow">→</span>
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
