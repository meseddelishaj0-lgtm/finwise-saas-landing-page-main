import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Market Rooms",
  description: "Live chat rooms for stocks, crypto, macro, and real estate.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/community/rooms" },
  openGraph: { title: "Live Market Rooms · WallStreetStocks", description: "Live chat rooms for stocks, crypto, macro, and real estate.", url: "https://www.wallstreetstocks.ai/community/rooms" },
  twitter: { title: "Live Market Rooms · WallStreetStocks", description: "Live chat rooms for stocks, crypto, macro, and real estate." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
