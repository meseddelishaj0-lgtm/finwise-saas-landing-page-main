import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Credit Risk Insights",
  description: "Credit spreads, ratings, and default-risk insights.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/features/bonds/credit-risk-insights" },
  openGraph: { title: "Credit Risk Insights · WallStreetStocks", description: "Credit spreads, ratings, and default-risk insights.", url: "https://www.wallstreetstocks.ai/features/bonds/credit-risk-insights" },
  twitter: { title: "Credit Risk Insights · WallStreetStocks", description: "Credit spreads, ratings, and default-risk insights." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
