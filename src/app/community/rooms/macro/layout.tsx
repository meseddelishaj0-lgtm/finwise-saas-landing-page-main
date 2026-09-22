import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Macro Room",
  description: "Live macro and economy chat with the WallStreetStocks community.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/community/rooms/macro" },
  openGraph: { title: "Macro Room · WallStreetStocks", description: "Live macro and economy chat with the WallStreetStocks community.", url: "https://www.wallstreetstocks.ai/community/rooms/macro" },
  twitter: { title: "Macro Room · WallStreetStocks", description: "Live macro and economy chat with the WallStreetStocks community." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
