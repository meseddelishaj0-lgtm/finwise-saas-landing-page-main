// Trusted, server-side resolution of a user's subscription tier — DB only,
// never anything the client sends beyond the user id. Mirrors the logic in
// /api/subscription/status and /api/stock-picks, but fixes the LIFETIME case:
// a lifetime purchase has `subscriptionExpiry = null`, and the old
// `expiry ? (expiry>now && active) : false` check treated null as "not
// subscribed", so lifetime buyers read as free. Here an active status with a
// null expiry is treated as a (non-expiring) lifetime subscription.
import { prisma } from "@/lib/prisma";

export type Tier = "free" | "gold" | "platinum" | "diamond";

export async function resolveUserTier(userId: number): Promise<Tier> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionTier: true,
      subscriptionExpiry: true,
      subscriptionStatus: true,
      referralPremiumExpiry: true,
    },
  });
  if (!user) return "free";

  const now = new Date();
  // Active RevenueCat/Stripe sub: status active AND (no expiry = lifetime, or a
  // future expiry).
  const hasPaidSubscription =
    user.subscriptionStatus === "active" &&
    (user.subscriptionExpiry ? new Date(user.subscriptionExpiry) > now : true);
  const hasReferralPremium = user.referralPremiumExpiry
    ? new Date(user.referralPremiumExpiry) > now
    : false;

  if ((hasPaidSubscription || hasReferralPremium) && user.subscriptionTier) {
    const t = user.subscriptionTier.toLowerCase();
    if (t === "gold" || t === "platinum" || t === "diamond") return t;
    // A stored "lifetime" tier is Diamond-level access.
    if (t === "lifetime") return "diamond";
  }
  return "free";
}

export function isPaidTier(tier: Tier): boolean {
  return tier === "gold" || tier === "platinum" || tier === "diamond";
}
