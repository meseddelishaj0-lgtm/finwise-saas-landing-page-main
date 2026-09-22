import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create an Account",
  description: "Create a free WallStreetStocks account.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/register" },
  openGraph: { title: "Create an Account · WallStreetStocks", description: "Create a free WallStreetStocks account.", url: "https://www.wallstreetstocks.ai/register" },
  twitter: { title: "Create an Account · WallStreetStocks", description: "Create a free WallStreetStocks account." },
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
