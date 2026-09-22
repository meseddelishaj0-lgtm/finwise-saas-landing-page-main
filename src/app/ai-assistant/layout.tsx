import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Financial Assistant",
  description: "Ask the WallStreetStocks AI anything about stocks, ETFs, crypto, and markets — answers grounded in live data and fundamentals.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/ai-assistant" },
  openGraph: { title: "AI Financial Assistant · WallStreetStocks", description: "Ask the WallStreetStocks AI anything about stocks, ETFs, crypto, and markets — answers grounded in live data and fundamentals.", url: "https://www.wallstreetstocks.ai/ai-assistant" },
  twitter: { title: "AI Financial Assistant · WallStreetStocks", description: "Ask the WallStreetStocks AI anything about stocks, ETFs, crypto, and markets — answers grounded in live data and fundamentals." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
