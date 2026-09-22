import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community Events",
  description: "Upcoming WallStreetStocks community events, AMAs, and live sessions.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/community/members/events" },
  openGraph: { title: "Community Events · WallStreetStocks", description: "Upcoming WallStreetStocks community events, AMAs, and live sessions.", url: "https://www.wallstreetstocks.ai/community/members/events" },
  twitter: { title: "Community Events · WallStreetStocks", description: "Upcoming WallStreetStocks community events, AMAs, and live sessions." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
