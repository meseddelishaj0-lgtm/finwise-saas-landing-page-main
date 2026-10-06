import prisma from "@/lib/prisma";

export type PlanTier = "free" | "gold" | "platinum" | "diamond" | "lifetime";
export type PlanSource = "app" | "referral" | "stripe" | null;

const RANK: Record<PlanTier, number> = { free: 0, gold: 1, platinum: 2, diamond: 3, lifetime: 4 };

function normalizeTier(raw: string | null | undefined): PlanTier {
  const t = (raw || "").toLowerCase().trim();
  return t in RANK ? (t as PlanTier) : "free";
}

// Lifetime unlocks the same features as Diamond.
export function featureTier(tier: PlanTier): Exclude<PlanTier, "lifetime"> {
  return tier === "lifetime" ? "diamond" : tier;
}

// The user's active plan across every way they can pay: an in-app purchase
// (RevenueCat → subscriptionTier), referral premium, or a website Stripe
// checkout (→ currentPlan). The highest active tier wins.
export async function resolveUserPlan(
  userId: number
): Promise<{ tier: PlanTier; source: PlanSource; expiresAt: string | null }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionTier: true,
      subscriptionExpiry: true,
      subscriptionStatus: true,
      referralPremiumExpiry: true,
      stripeCustomerId: true,
      currentPlan: true,
    },
  });
  if (!user) return { tier: "free", source: null, expiresAt: null };

  const now = new Date();
  let best: { tier: PlanTier; source: PlanSource; expiresAt: string | null } = {
    tier: "free",
    source: null,
    expiresAt: null,
  };
  const consider = (tier: PlanTier, source: PlanSource, expiresAt: Date | null) => {
    if (RANK[tier] > RANK[best.tier]) best = { tier, source, expiresAt: expiresAt?.toISOString() ?? null };
  };

  // Null expiry + active status = lifetime purchase (never expires).
  const appActive =
    user.subscriptionStatus === "active" &&
    (user.subscriptionExpiry ? user.subscriptionExpiry > now : true);
  if (appActive) consider(normalizeTier(user.subscriptionTier), "app", user.subscriptionExpiry);

  if (user.referralPremiumExpiry && user.referralPremiumExpiry > now) {
    consider(normalizeTier(user.subscriptionTier), "referral", user.referralPremiumExpiry);
  }

  // The Stripe webhook stores the plan name ("gold"…) and flips it to
  // "Canceled" when the subscription ends. The RevenueCat webhook also writes a
  // product id into currentPlan, which normalizeTier maps to "free".
  if (user.stripeCustomerId) consider(normalizeTier(user.currentPlan), "stripe", null);

  return best;
}
