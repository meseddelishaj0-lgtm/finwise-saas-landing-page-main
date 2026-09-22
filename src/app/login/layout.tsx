import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log In",
  description: "Log in to your WallStreetStocks account.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/login" },
  openGraph: { title: "Log In · WallStreetStocks", description: "Log in to your WallStreetStocks account.", url: "https://www.wallstreetstocks.ai/login" },
  twitter: { title: "Log In · WallStreetStocks", description: "Log in to your WallStreetStocks account." },
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
