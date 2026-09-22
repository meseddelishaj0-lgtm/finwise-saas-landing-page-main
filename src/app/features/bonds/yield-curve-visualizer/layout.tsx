import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Yield Curve Visualizer",
  description: "Interactive US Treasury yield curve — track inversions and shifts over time.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/features/bonds/yield-curve-visualizer" },
  openGraph: { title: "Yield Curve Visualizer · WallStreetStocks", description: "Interactive US Treasury yield curve — track inversions and shifts over time.", url: "https://www.wallstreetstocks.ai/features/bonds/yield-curve-visualizer" },
  twitter: { title: "Yield Curve Visualizer · WallStreetStocks", description: "Interactive US Treasury yield curve — track inversions and shifts over time." },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
