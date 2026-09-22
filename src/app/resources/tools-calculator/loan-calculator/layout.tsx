import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Loan Calculator",
  description: "Calculate monthly payments and total interest on any loan.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/resources/tools-calculator/loan-calculator" },
  openGraph: { title: "Loan Calculator · WallStreetStocks", description: "Calculate monthly payments and total interest on any loan.", url: "https://www.wallstreetstocks.ai/resources/tools-calculator/loan-calculator" },
  twitter: { title: "Loan Calculator · WallStreetStocks", description: "Calculate monthly payments and total interest on any loan." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
