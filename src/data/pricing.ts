import { IPricing } from "@/types";

export const tiers: IPricing[] = [
  {
    name: "Gold",
    price: 3.99,
    stripePriceId: "price_1SHbDZPeBbS1NpEb4NoOjvIY", // 🔹 Replace with your real Stripe Price ID
    features: [
      "AI Stock Picks",
      "Weekly Research Reports",
      "Fundamental AI Ratings",
      "Beginner Portfolio Templates",
      "Community Access",
    ],
  },
  {
    name: "Platinum",
    price: 9.99,
    stripePriceId: "price_1SHbFrPeBbS1NpEbQRNxsO25", // 🔹 Replace with your real Stripe Price ID
    features: [
      "Real-Time AI Dashboards",
      "Advanced Portfolio Tracking",
      "Sector Rotation & Trend Forecasts",
      "Custom Research Requests",
      "Exclusive Weekly Briefings",
    ],
  },
  {
    name: "Diamond",
    price: 20.99,
    stripePriceId: "price_1SHbGuPeBbS1NpEb38dQzJ9d", // 🔹 Replace with your real Stripe Price ID
    features: [
      "Full AI Research Access",
      "Predictive Market Outlooks",
      "Institutional-Grade Reports",
      "Portfolio Optimization Tools",
      "Priority One-on-One Research Access",
      "Early Access to New AI Models",
    ],
  },
];
