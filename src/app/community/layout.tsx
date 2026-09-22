import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community",
  description: "Join the WallStreetStocks investor community — forums, live rooms, and members sharing ideas on stocks, crypto, and macro.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/community" },
  openGraph: { title: "Community · WallStreetStocks", description: "Join the WallStreetStocks investor community — forums, live rooms, and members sharing ideas on stocks, crypto, and macro.", url: "https://www.wallstreetstocks.ai/community" },
  twitter: { title: "Community · WallStreetStocks", description: "Join the WallStreetStocks investor community — forums, live rooms, and members sharing ideas on stocks, crypto, and macro." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
