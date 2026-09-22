import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Long-Term Market Outlook",
  description: "An AI-driven long-term outlook for markets, sectors, and the economy.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/ai-dashboard/outlook" },
  openGraph: { title: "Long-Term Market Outlook · WallStreetStocks", description: "An AI-driven long-term outlook for markets, sectors, and the economy.", url: "https://www.wallstreetstocks.ai/ai-dashboard/outlook" },
  twitter: { title: "Long-Term Market Outlook · WallStreetStocks", description: "An AI-driven long-term outlook for markets, sectors, and the economy." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
