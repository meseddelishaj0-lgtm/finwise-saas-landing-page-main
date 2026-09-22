import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compound Interest Calculator",
  description: "Calculate how your savings grow with compound interest over time.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/resources/tools-calculator/compound-interest" },
  openGraph: { title: "Compound Interest Calculator · WallStreetStocks", description: "Calculate how your savings grow with compound interest over time.", url: "https://www.wallstreetstocks.ai/resources/tools-calculator/compound-interest" },
  twitter: { title: "Compound Interest Calculator · WallStreetStocks", description: "Calculate how your savings grow with compound interest over time." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
