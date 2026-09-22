import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Accounting Guide",
  description: "Accounting fundamentals for investors — reading financial statements and key ratios.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/resources/accounting" },
  openGraph: { title: "Accounting Guide · WallStreetStocks", description: "Accounting fundamentals for investors — reading financial statements and key ratios.", url: "https://www.wallstreetstocks.ai/resources/accounting" },
  twitter: { title: "Accounting Guide · WallStreetStocks", description: "Accounting fundamentals for investors — reading financial statements and key ratios." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
