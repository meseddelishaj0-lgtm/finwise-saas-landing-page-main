// src/lib/verifySubscription.ts
// Server-side subscription verification against RevenueCat.
//
// The mobile client used to POST its own `subscriptionTier` to the sync/profile
// endpoints, which meant anyone could `curl` themselves Diamond for free. Tier
// is now derived from RevenueCat's REST API (the source of truth for purchases)
// instead of trusting the client. RevenueCat is keyed by our numeric user id
// (the app calls `Purchases.logIn(user.id)`), matching the webhook.

const REVENUECAT_API_URL = 'https://api.revenuecat.com/v1';

type Tier = 'free' | 'gold' | 'platinum' | 'diamond';

export function mapProductToTier(productId: string | null | undefined): Tier {
  const p = (productId || '').toLowerCase();
  if (p.includes('diamond') || p.includes('premium_plus') || p.includes('29.99')) return 'diamond';
  if (p.includes('platinum') || p.includes('premium') || p.includes('19.99')) return 'platinum';
  if (p.includes('gold') || p.includes('basic') || p.includes('9.99')) return 'gold';
  return 'gold'; // any confirmed-but-unrecognized paid product → lowest paid tier
}

export interface VerifiedSubscription {
  subscriptionTier: Tier;
  subscriptionStatus: 'active';
  subscriptionExpiry: Date | null;
  subscriptionProductId: string;
}

/**
 * Ask RevenueCat what this user actually owns.
 *
 * Returns:
 *  - a VerifiedSubscription when there is an active, unexpired paid entitlement;
 *  - `null` when we could NOT confirm one — either because RevenueCat reports no
 *    active entitlement, or because verification is unavailable (no API key /
 *    network error). Callers MUST treat `null` as "do not change the stored
 *    tier": we never downgrade a paying user just because a lookup failed, and an
 *    attacker's unverified claim never elevates them. Downgrades/expirations flow
 *    through the authenticated RevenueCat webhook instead.
 */
export async function getVerifiedSubscription(userId: number | string): Promise<VerifiedSubscription | null> {
  const apiKey = process.env.REVENUECAT_API_KEY;
  if (!apiKey) return null; // can't verify → preserve existing tier

  try {
    const res = await fetch(`${REVENUECAT_API_URL}/subscribers/${userId}`, {
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    });
    if (!res.ok) return null; // treat lookup failure as "unknown", never as downgrade

    const data = await res.json();
    const entitlements = data?.subscriber?.entitlements;
    if (!entitlements || typeof entitlements !== 'object') return null;

    // Pick the active, unexpired entitlement with the furthest expiry.
    let best: { product: string; expires: Date | null } | null = null;
    const now = Date.now();
    for (const key of Object.keys(entitlements)) {
      const ent = entitlements[key];
      if (!ent) continue;
      const expiresRaw = ent.expires_date as string | null | undefined;
      const expires = expiresRaw ? new Date(expiresRaw) : null;
      const isActive = expires ? expires.getTime() > now : true; // null expiry = lifetime
      if (!isActive) continue;
      if (!best || (expires && best.expires && expires > best.expires) || (expires && !best.expires)) {
        best = { product: ent.product_identifier || key, expires };
      }
    }

    if (!best) return null; // RevenueCat reachable but no active entitlement

    return {
      subscriptionTier: mapProductToTier(best.product),
      subscriptionStatus: 'active',
      subscriptionExpiry: best.expires,
      subscriptionProductId: best.product,
    };
  } catch {
    return null; // network/parse error → unknown, preserve existing tier
  }
}
