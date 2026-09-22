import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Sentiment Analysis",
  description: "AI sentiment scoring from news, filings, and social data for any stock.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/features/ai/sentiment-analysis" },
  openGraph: { title: "AI Sentiment Analysis · WallStreetStocks", description: "AI sentiment scoring from news, filings, and social data for any stock.", url: "https://www.wallstreetstocks.ai/features/ai/sentiment-analysis" },
  twitter: { title: "AI Sentiment Analysis · WallStreetStocks", description: "AI sentiment scoring from news, filings, and social data for any stock." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
