import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Financial Calculators",
  description: "Free calculators for compound interest, loans, mortgages, ROI, and taxes.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/resources/tools-calculator" },
  openGraph: { title: "Financial Calculators · WallStreetStocks", description: "Free calculators for compound interest, loans, mortgages, ROI, and taxes.", url: "https://www.wallstreetstocks.ai/resources/tools-calculator" },
  twitter: { title: "Financial Calculators · WallStreetStocks", description: "Free calculators for compound interest, loans, mortgages, ROI, and taxes." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
