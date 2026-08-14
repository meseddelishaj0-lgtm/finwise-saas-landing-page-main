import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const revalidate = 60;

interface Props {
  params: { slug: string };
}

const fmtDate = (d: Date) =>
  d
    .toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    .toUpperCase();

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await prisma.newsArticle.findUnique({
    where: { slug: params.slug },
    select: { title: true, summary: true, imageUrl: true, published: true },
  });
  if (!article || !article.published) return { title: "Newsroom — WallStreetStocks" };
  return {
    title: `${article.title} — WallStreetStocks Newsroom`,
    description: article.summary ?? "From the WallStreetStocks desk.",
    openGraph: {
      title: article.title,
      description: article.summary ?? "From the WallStreetStocks desk.",
      images: article.imageUrl ? [article.imageUrl] : undefined,
    },
  };
}

export default async function NewsroomArticlePage({ params }: Props) {
  const article = await prisma.newsArticle.findUnique({
    where: { slug: params.slug },
  });
  if (!article || !article.published) notFound();

  const paragraphs = article.content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <section
      className="relative w-screen min-h-screen text-white bg-night"
      style={{ marginLeft: "calc(-50vw + 50%)" }}
    >
      <article className="max-w-3xl mx-auto px-6 md:px-10 pt-28 md:pt-32 pb-24">
        <Link
          href="/newsroom"
          className="font-monodata text-[11px] uppercase tracking-widest text-gray-500 hover:text-gold transition-colors"
        >
          ← Newsroom
        </Link>

        <div className="mt-6 flex items-center gap-3 font-monodata text-[11px] uppercase tracking-widest text-gray-500">
          <span className="text-gold">From the desk</span>
          <span>·</span>
          <span>{fmtDate(article.publishedAt)}</span>
          {article.symbol && (
            <>
              <span>·</span>
              <Link
                href={`/terminal?symbol=${encodeURIComponent(article.symbol)}`}
                className="text-gold bg-yellow-400/10 border border-yellow-400/25 rounded px-2 py-0.5 hover:bg-yellow-400/20 transition-colors"
              >
                {article.symbol}
              </Link>
            </>
          )}
        </div>

        <h1 className="mt-5 font-display text-ivory text-4xl md:text-6xl leading-[1.05] tracking-tight">
          {article.title}
        </h1>

        {article.summary && (
          <p className="mt-6 text-xl text-gray-300 leading-relaxed">{article.summary}</p>
        )}

        {article.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.imageUrl}
            alt=""
            className="mt-10 w-full rounded-xl border border-white/10"
          />
        )}

        <div className="mt-10 space-y-6 text-lg text-gray-300 leading-relaxed">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <div className="mt-14 pt-8 border-t border-white/10 font-monodata text-[11px] uppercase tracking-widest text-gray-500">
          WallStreetStocks Newsroom · Not investment advice
        </div>
      </article>
    </section>
  );
}
