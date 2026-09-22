import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Money Market Dashboard",
  description: "Money market rates, funds, and short-term yield data.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/money-market" },
  openGraph: { title: "Money Market Dashboard · WallStreetStocks", description: "Money market rates, funds, and short-term yield data.", url: "https://www.wallstreetstocks.ai/money-market" },
  twitter: { title: "Money Market Dashboard · WallStreetStocks", description: "Money market rates, funds, and short-term yield data." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
