import type { Metadata } from "next";

// Pop-out panel windows are a tool surface, not a page to index.
export const metadata: Metadata = {
  title: "Terminal Panel",
  description: "A single WallStreetStocks terminal panel in its own window.",
  alternates: { canonical: "https://www.wallstreetstocks.ai/terminal" },
  robots: { index: false, follow: false },
};

export default function PopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
