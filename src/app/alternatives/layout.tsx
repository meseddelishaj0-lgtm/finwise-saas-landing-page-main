import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Alternative Investments",
  description: "Explore alternative assets — crypto, private markets, real assets, and more — with live data and AI analysis.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/alternatives" },
  openGraph: { title: "Alternative Investments · WallStreetStocks", description: "Explore alternative assets — crypto, private markets, real assets, and more — with live data and AI analysis.", url: "https://www.wallstreetstocks.ai/alternatives" },
  twitter: { title: "Alternative Investments · WallStreetStocks", description: "Explore alternative assets — crypto, private markets, real assets, and more — with live data and AI analysis." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
