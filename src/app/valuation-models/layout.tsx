import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Valuation Models",
  description: "DCF and multiples-based valuation models for any stock.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/valuation-models" },
  openGraph: { title: "Valuation Models · WallStreetStocks", description: "DCF and multiples-based valuation models for any stock.", url: "https://www.wallstreetstocks.ai/valuation-models" },
  twitter: { title: "Valuation Models · WallStreetStocks", description: "DCF and multiples-based valuation models for any stock." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
