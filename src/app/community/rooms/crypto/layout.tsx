import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Crypto Room",
  description: "Live crypto chat with the WallStreetStocks community.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/community/rooms/crypto" },
  openGraph: { title: "Crypto Room · WallStreetStocks", description: "Live crypto chat with the WallStreetStocks community.", url: "https://www.wallstreetstocks.ai/community/rooms/crypto" },
  twitter: { title: "Crypto Room · WallStreetStocks", description: "Live crypto chat with the WallStreetStocks community." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
