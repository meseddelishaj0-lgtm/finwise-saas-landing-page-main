import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Insurance Guide",
  description: "Insurance basics — life, health, property, and how coverage fits a financial plan.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/resources/insurance" },
  openGraph: { title: "Insurance Guide · WallStreetStocks", description: "Insurance basics — life, health, property, and how coverage fits a financial plan.", url: "https://www.wallstreetstocks.ai/resources/insurance" },
  twitter: { title: "Insurance Guide · WallStreetStocks", description: "Insurance basics — life, health, property, and how coverage fits a financial plan." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
