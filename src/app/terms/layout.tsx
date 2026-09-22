import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description: "The terms and conditions for using WallStreetStocks.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/terms" },
  openGraph: { title: "Terms and Conditions · WallStreetStocks", description: "The terms and conditions for using WallStreetStocks.", url: "https://www.wallstreetstocks.ai/terms" },
  twitter: { title: "Terms and Conditions · WallStreetStocks", description: "The terms and conditions for using WallStreetStocks." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
