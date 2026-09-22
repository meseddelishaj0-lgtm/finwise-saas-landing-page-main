import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Investing Strategies Forum",
  description: "Share and debate investing strategies — value, growth, dividends, options, and more.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/community/forums/strategies" },
  openGraph: { title: "Investing Strategies Forum · WallStreetStocks", description: "Share and debate investing strategies — value, growth, dividends, options, and more.", url: "https://www.wallstreetstocks.ai/community/forums/strategies" },
  twitter: { title: "Investing Strategies Forum · WallStreetStocks", description: "Share and debate investing strategies — value, growth, dividends, options, and more." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
