import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stock Market News",
  description: "Live stock market news on the wire — company headlines, market movers, and the desk's daily reads.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/news" },
  openGraph: { title: "Stock Market News · WallStreetStocks", description: "Live stock market news on the wire — company headlines, market movers, and the desk's daily reads.", url: "https://www.wallstreetstocks.ai/news" },
  twitter: { title: "Stock Market News · WallStreetStocks", description: "Live stock market news on the wire — company headlines, market movers, and the desk's daily reads." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
