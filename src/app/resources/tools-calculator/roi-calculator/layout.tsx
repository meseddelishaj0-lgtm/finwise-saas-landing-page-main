import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ROI Calculator",
  description: "Calculate return on investment and annualized return.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/resources/tools-calculator/roi-calculator" },
  openGraph: { title: "ROI Calculator · WallStreetStocks", description: "Calculate return on investment and annualized return.", url: "https://www.wallstreetstocks.ai/resources/tools-calculator/roi-calculator" },
  twitter: { title: "ROI Calculator · WallStreetStocks", description: "Calculate return on investment and annualized return." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
