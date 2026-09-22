import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Risk & Volatility Analysis",
  description: "Volatility, drawdown, beta, and risk-adjusted return analysis for stocks and portfolios, powered by AI.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/Risk-Volatility-Analysis" },
  openGraph: { title: "Risk & Volatility Analysis · WallStreetStocks", description: "Volatility, drawdown, beta, and risk-adjusted return analysis for stocks and portfolios, powered by AI.", url: "https://www.wallstreetstocks.ai/Risk-Volatility-Analysis" },
  twitter: { title: "Risk & Volatility Analysis · WallStreetStocks", description: "Volatility, drawdown, beta, and risk-adjusted return analysis for stocks and portfolios, powered by AI." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
