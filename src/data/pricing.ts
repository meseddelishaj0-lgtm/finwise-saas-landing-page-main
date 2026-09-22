import { IPricing } from "@/types";

export const tiers: IPricing[] = [
  {
    name: "Gold",
    price: 19.99,
    yearlyPrice: 159.99,
    stripePriceId: "price_1SHbDZPeBbS1NpEb4NoOjvIY", // 🔹 Replace with your real Stripe Price ID
    features: [
      "5 Expert Stock Picks",
      "Ad-free experience",
      "Basic watchlists",
      "Community access",
      "Daily market summary",
    ],
  },
  {
    name: "Platinum",
    price: 39.99,
    yearlyPrice: 319.99,
    stripePriceId: "price_1SHbFrPeBbS1NpEbQRNxsO25", // 🔹 Replace with your real Stripe Price ID
    features: [
      "8 Expert Stock Picks",
      "Screener filters & premium presets",
      "Unlimited watchlists",
      "Priority support",
    ],
  },
  {
    name: "Diamond",
    price: 59.99,
    yearlyPrice: 479.99,
    stripePriceId: "price_1SHbGuPeBbS1NpEb38dQzJ9d", // 🔹 Replace with your real Stripe Price ID
    features: [
      "15 Expert Stock Picks",
      "AI tools (Analyzer, Compare, Forecast)",
      "AI financial assistant",
      "Insider trading data",
      "Research reports & portfolio tools",
      "Verified profile badge",
    ],
  },
];
