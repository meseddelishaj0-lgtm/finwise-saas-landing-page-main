import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Real Estate Room",
  description: "Live real estate chat with the WallStreetStocks community.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/community/rooms/real-estate" },
  openGraph: { title: "Real Estate Room · WallStreetStocks", description: "Live real estate chat with the WallStreetStocks community.", url: "https://www.wallstreetstocks.ai/community/rooms/real-estate" },
  twitter: { title: "Real Estate Room · WallStreetStocks", description: "Live real estate chat with the WallStreetStocks community." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
