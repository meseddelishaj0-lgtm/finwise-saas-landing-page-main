import type { Metadata } from "next";
import TerminalClient from "./TerminalClient";

interface Props {
  searchParams: { symbol?: string };
}

// The terminal itself is a client component keyed off ?symbol=, so the
// per-symbol title/description is resolved here on the server.
export function generateMetadata({ searchParams }: Props): Metadata {
  const symbol = String(searchParams.symbol || "NVDA").toUpperCase().replace(/[^A-Z0-9.^=\-/]/g, "").slice(0, 16) || "NVDA";
  const display = symbol.replace("^", "");
  const title = `${display} Stock Price, Chart & AI Research`;
  const description = `Live ${display} quote, interactive chart, fundamentals, analyst ratings, ownership, earnings, and news — on the WallStreetStocks terminal.`;
  const url = `https://www.wallstreetstocks.ai/terminal?symbol=${encodeURIComponent(symbol)}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title: `${title} · WallStreetStocks`, description, url },
    twitter: { title: `${title} · WallStreetStocks`, description },
  };
}

export default function TerminalPage() {
  return <TerminalClient />;
}
