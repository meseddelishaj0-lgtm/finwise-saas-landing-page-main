import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Delete Your Account",
  description: "How to permanently delete your WallStreetStocks account and data.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/delete-account" },
  openGraph: { title: "Delete Your Account · WallStreetStocks", description: "How to permanently delete your WallStreetStocks account and data.", url: "https://www.wallstreetstocks.ai/delete-account" },
  twitter: { title: "Delete Your Account · WallStreetStocks", description: "How to permanently delete your WallStreetStocks account and data." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
