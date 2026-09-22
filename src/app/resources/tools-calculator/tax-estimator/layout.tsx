import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tax Estimator",
  description: "Estimate your income tax with a quick calculator.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/resources/tools-calculator/tax-estimator" },
  openGraph: { title: "Tax Estimator · WallStreetStocks", description: "Estimate your income tax with a quick calculator.", url: "https://www.wallstreetstocks.ai/resources/tools-calculator/tax-estimator" },
  twitter: { title: "Tax Estimator · WallStreetStocks", description: "Estimate your income tax with a quick calculator." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
