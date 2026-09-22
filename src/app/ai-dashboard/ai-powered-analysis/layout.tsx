import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI-Powered Stock Analysis",
  description: "Deep AI analysis of any stock — fundamentals, momentum, sentiment, and risk distilled into a plain-English brief.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/ai-dashboard/ai-powered-analysis" },
  openGraph: { title: "AI-Powered Stock Analysis · WallStreetStocks", description: "Deep AI analysis of any stock — fundamentals, momentum, sentiment, and risk distilled into a plain-English brief.", url: "https://www.wallstreetstocks.ai/ai-dashboard/ai-powered-analysis" },
  twitter: { title: "AI-Powered Stock Analysis · WallStreetStocks", description: "Deep AI analysis of any stock — fundamentals, momentum, sentiment, and risk distilled into a plain-English brief." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
