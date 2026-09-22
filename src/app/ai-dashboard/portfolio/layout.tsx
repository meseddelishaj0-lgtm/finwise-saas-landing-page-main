import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Smart Portfolio Tips",
  description: "AI suggestions to strengthen your portfolio — diversification, risk balance, and allocation ideas.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/ai-dashboard/portfolio" },
  openGraph: { title: "Smart Portfolio Tips · WallStreetStocks", description: "AI suggestions to strengthen your portfolio — diversification, risk balance, and allocation ideas.", url: "https://www.wallstreetstocks.ai/ai-dashboard/portfolio" },
  twitter: { title: "Smart Portfolio Tips · WallStreetStocks", description: "AI suggestions to strengthen your portfolio — diversification, risk balance, and allocation ideas." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
