import { IPricing } from "@/types";

export const tiers: IPricing[] = [
  {
    name: "Gold",
    price: 29.99,
    stripePriceId: "price_1SHbDZPeBbS1NpEb4NoOjvIY", // 🔹 Replace with your real Stripe Price ID
    features: [
      "5 Stock Picks",
      "Weekly Research Reports",
      "Fundamental AI Ratings",
      "Beginner Portfolio Templates",
      "Community Access",
      "Email Support",
    ],
  },
  {
    name: "Platinum",
    price: 49.99,
    stripePriceId: "price_1SHbFrPeBbS1NpEbQRNxsO25", // 🔹 Replace with your real Stripe Price ID
    features: [
      "Real-Time AI Dashboards",
      "Advanced Portfolio Tracking",
      "Sector Rotation & Trend Forecasts",
      "Custom Research Requests",
      "10 Stock Picks",
      "Exclusive Weekly Briefings",
    ],
  },
  {
    name: "Diamond",
    price: 99.99,
    stripePriceId: "price_1SHbGuPeBbS1NpEb38dQzJ9d", // 🔹 Replace with your real Stripe Price ID
    features: [
      "Full AI Research Access",
      "15 Stock Picks",
      "Predictive Market Outlooks",
      "Institutional-Grade Reports",
      "Portfolio Optimization Tools",
      "Priority One-on-One Research Access",
      "Early Access to New AI Models",
    ],
  },
];
