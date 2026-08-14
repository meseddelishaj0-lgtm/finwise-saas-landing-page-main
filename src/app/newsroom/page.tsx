import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import CommandLine from "@/components/ui/CommandLine";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Newsroom — WallStreetStocks",
  description: "Notes, calls, and commentary from the WallStreetStocks desk.",
};

const fmtDate = (d: Date) =>
  d
    .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    .toUpperCase();

export default async function NewsroomPage() {
  const articles = await prisma.newsArticle.findMany({
    where: { published: true },
    orderBy: { publishedAt: "desc" },
    take: 50,
    select: {
      slug: true,
      title: true,
      summary: true,
      symbol: true,
      publishedAt: true,
    },
  });

  return (
    <section
      className="relative w-screen min-h-screen text-white bg-night"
      style={{ marginLeft: "calc(-50vw + 50%)" }}
    >
      <div className="max-w-5xl mx-auto px-6 md:px-10 pt-28 md:pt-32 pb-24">
        <CommandLine cmd="NWS" note="from the desk" className="mb-4" />
        <h1 className="font-display text-ivory text-5xl md:text-6xl tracking-tight">
          From the desk.
        </h1>
        <p className="mt-4 text-gray-400 max-w-2xl text-lg">
          Notes, calls, and commentary published by WallStreetStocks — alongside
          the wire, not instead of it.
        </p>

        <div className="mt-12 border-t border-white/10">
          {articles.length === 0 && (
            <p className="py-10 text-gray-500">
              Nothing on the wire yet. Check back soon.
            </p>
          )}
          {articles.map((a) => (
            <Link
              key={a.slug}
              href={`/newsroom/${a.slug}`}
              className="group flex flex-col md:flex-row md:items-baseline gap-2 md:gap-8 py-7 border-b border-white/10 transition-colors hover:bg-white/[0.02] md:px-2"
            >
              <span className="font-monodata text-[11px] uppercase tracking-widest text-gray-500 md:w-32 flex-shrink-0">
                {fmtDate(a.publishedAt)}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-display text-2xl md:text-3xl text-ivory leading-snug group-hover:text-gold-soft transition-colors">
                  {a.title}
                </span>
                {a.summary && (
                  <span className="block mt-2 text-gray-400 leading-relaxed">{a.summary}</span>
                )}
              </span>
              <span className="flex items-center gap-3 flex-shrink-0">
                {a.symbol && (
                  <span className="font-monodata text-xs font-semibold text-gold bg-yellow-400/10 border border-yellow-400/25 rounded px-2 py-0.5">
                    {a.symbol}
                  </span>
                )}
                <span className="font-monodata text-gray-600 group-hover:text-gold transition-all duration-300 group-hover:translate-x-1">
                  →
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
