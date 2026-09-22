import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stocks Room",
  description: "Live stock market chat with the WallStreetStocks community.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/community/rooms/stocks" },
  openGraph: { title: "Stocks Room · WallStreetStocks", description: "Live stock market chat with the WallStreetStocks community.", url: "https://www.wallstreetstocks.ai/community/rooms/stocks" },
  twitter: { title: "Stocks Room · WallStreetStocks", description: "Live stock market chat with the WallStreetStocks community." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
