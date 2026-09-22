import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Crypto Prices & Market Dashboard",
  description: "Live Bitcoin, Ethereum, and altcoin prices, market caps, and charts, with AI analysis.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/crypto" },
  openGraph: { title: "Crypto Prices & Market Dashboard · WallStreetStocks", description: "Live Bitcoin, Ethereum, and altcoin prices, market caps, and charts, with AI analysis.", url: "https://www.wallstreetstocks.ai/crypto" },
  twitter: { title: "Crypto Prices & Market Dashboard · WallStreetStocks", description: "Live Bitcoin, Ethereum, and altcoin prices, market caps, and charts, with AI analysis." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
