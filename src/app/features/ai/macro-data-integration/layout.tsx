import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Macro Data Integration",
  description: "Economic indicators blended with asset pricing and risk models.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/features/ai/macro-data-integration" },
  openGraph: { title: "Macro Data Integration · WallStreetStocks", description: "Economic indicators blended with asset pricing and risk models.", url: "https://www.wallstreetstocks.ai/features/ai/macro-data-integration" },
  twitter: { title: "Macro Data Integration · WallStreetStocks", description: "Economic indicators blended with asset pricing and risk models." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
