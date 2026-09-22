import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Finance Guides",
  description: "Finance explainers — valuation, risk and return, portfolios, and behavioral finance.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/resources/finance" },
  openGraph: { title: "Finance Guides · WallStreetStocks", description: "Finance explainers — valuation, risk and return, portfolios, and behavioral finance.", url: "https://www.wallstreetstocks.ai/resources/finance" },
  twitter: { title: "Finance Guides · WallStreetStocks", description: "Finance explainers — valuation, risk and return, portfolios, and behavioral finance." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
