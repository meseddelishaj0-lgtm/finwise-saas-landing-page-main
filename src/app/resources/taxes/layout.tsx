import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Taxes Guide",
  description: "Investment taxes explained — capital gains, dividends, and tax-advantaged accounts.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/resources/taxes" },
  openGraph: { title: "Taxes Guide · WallStreetStocks", description: "Investment taxes explained — capital gains, dividends, and tax-advantaged accounts.", url: "https://www.wallstreetstocks.ai/resources/taxes" },
  twitter: { title: "Taxes Guide · WallStreetStocks", description: "Investment taxes explained — capital gains, dividends, and tax-advantaged accounts." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
