import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How WallStreetStocks collects, uses, and protects your data.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/privacy" },
  openGraph: { title: "Privacy Policy · WallStreetStocks", description: "How WallStreetStocks collects, uses, and protects your data.", url: "https://www.wallstreetstocks.ai/privacy" },
  twitter: { title: "Privacy Policy · WallStreetStocks", description: "How WallStreetStocks collects, uses, and protects your data." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
