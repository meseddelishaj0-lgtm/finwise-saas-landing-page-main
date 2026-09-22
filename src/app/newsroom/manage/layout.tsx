import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Newsroom Admin",
  description: "Manage newsroom articles.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/newsroom/manage" },
  openGraph: { title: "Newsroom Admin · WallStreetStocks", description: "Manage newsroom articles.", url: "https://www.wallstreetstocks.ai/newsroom/manage" },
  twitter: { title: "Newsroom Admin · WallStreetStocks", description: "Manage newsroom articles." },
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
