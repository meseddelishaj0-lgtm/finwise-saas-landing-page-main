import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Stock Picks",
  description: "AI-selected stock picks with the reasoning attached — bull case, risks, and catalysts — tracked in public against the S&P 500.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/ai-stock-picks" },
  openGraph: { title: "AI Stock Picks · WallStreetStocks", description: "AI-selected stock picks with the reasoning attached — bull case, risks, and catalysts — tracked in public against the S&P 500.", url: "https://www.wallstreetstocks.ai/ai-stock-picks" },
  twitter: { title: "AI Stock Picks · WallStreetStocks", description: "AI-selected stock picks with the reasoning attached — bull case, risks, and catalysts — tracked in public against the S&P 500." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
