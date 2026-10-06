// Plan features — mirrors the app's paywall tiers
// (wallstreetstocks-app/components/PaywallScreen.tsx). Used by the /plans
// comparison table and the dashboard, so both always agree.

export type PaidTier = "gold" | "platinum" | "diamond";
export type Cell = boolean | string;

export interface PlanFeature {
  key: string;
  label: string;
  /** Value per tier, in gold / platinum / diamond order. */
  values: [Cell, Cell, Cell];
  /** What the feature gives you, shown on the dashboard. */
  blurb: string;
  /** Where the feature lives; omitted for features with nowhere to go. */
  href?: string;
  cta?: string;
}

export const PAID_TIERS: PaidTier[] = ["gold", "platinum", "diamond"];

export const PLAN_FEATURES: PlanFeature[] = [
  {
    key: "picks",
    label: "Expert stock picks",
    values: ["5", "8", "15"],
    blurb: "Hand-picked stocks with the reasoning behind each one.",
  },
  {
    key: "ad-free",
    label: "Ad-free experience",
    values: [true, true, true],
    blurb: "No ads anywhere in the app or on the site.",
  },
  {
    key: "community",
    label: "Community access",
    values: [true, true, true],
    blurb: "Forums, rooms and members — trade ideas with other investors.",
    href: "/community",
    cta: "Open community",
  },
  {
    key: "summary",
    label: "Daily market summary",
    values: [true, true, true],
    blurb: "The day's market-moving headlines in one place.",
    href: "/news",
    cta: "Read today's summary",
  },
  {
    key: "watchlists",
    label: "Watchlists",
    values: ["Basic", "Unlimited", "Unlimited"],
    blurb: "Track the tickers you care about in the Terminal.",
    href: "/terminal",
    cta: "Open watchlist",
  },
  {
    key: "screener",
    label: "Screener filters & premium presets",
    values: [false, true, true],
    blurb: "Screen 1,500 US stocks on fundamentals and performance.",
    href: "/screener",
    cta: "Open screener",
  },
  {
    key: "support",
    label: "Priority support",
    values: [false, true, true],
    blurb: "Jump the queue — your emails are answered first.",
    href: "mailto:wallstreetstocks@outlook.com?subject=Priority%20support",
    cta: "Email support",
  },
  {
    key: "ai-tools",
    label: "AI tools — Analyzer, Compare, Forecast",
    values: [false, false, true],
    blurb: "AI analysis, forecasts and long-term outlooks for any stock.",
    href: "/ai-dashboard",
    cta: "Open AI tools",
  },
  {
    key: "assistant",
    label: "AI financial assistant",
    values: [false, false, true],
    blurb: "Ask questions about stocks, markets and your portfolio.",
    href: "/ai-assistant",
    cta: "Ask the assistant",
  },
  {
    key: "insider",
    label: "Insider trading data",
    values: [false, false, true],
    blurb: "Insider transactions and institutional holders for any company.",
    href: "/terminal?symbol=AAPL&fn=HDS",
    cta: "View insider data",
  },
  {
    key: "research",
    label: "Research reports & portfolio tools",
    values: [false, false, true],
    blurb: "In-depth research reports plus portfolio tracking and analysis.",
    href: "/dashboard/reports",
    cta: "Read reports",
  },
  {
    key: "badge",
    label: "Verified profile badge",
    values: [false, false, true],
    blurb: "A verified badge next to your name in the community.",
  },
];

/** The value a tier gets for a feature; `false` means locked. */
export function featureValue(feature: PlanFeature, tier: PaidTier | "free"): Cell {
  if (tier === "free") return false;
  return feature.values[PAID_TIERS.indexOf(tier)];
}

/** The cheapest tier that includes a feature. */
export function minimumTier(feature: PlanFeature): PaidTier {
  return PAID_TIERS[feature.values.findIndex((v) => v !== false)];
}
