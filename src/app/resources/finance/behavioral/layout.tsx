import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Behavioral Finance",
  description: "The biases that move markets and how investors can avoid them.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/resources/finance/behavioral" },
  openGraph: { title: "Behavioral Finance · WallStreetStocks", description: "The biases that move markets and how investors can avoid them.", url: "https://www.wallstreetstocks.ai/resources/finance/behavioral" },
  twitter: { title: "Behavioral Finance · WallStreetStocks", description: "The biases that move markets and how investors can avoid them." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
