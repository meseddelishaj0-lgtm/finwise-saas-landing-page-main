import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const FMP_API_KEY = process.env.FMP_API_KEY || "";
const FMP_BASE_URL = "https://financialmodelingprep.com/api/v3";

// How many picks each tier can see. The server NEVER returns more than this,
// so a user can't read symbols they haven't paid for.
const PICKS_BY_TIER: Record<string, number> = {
  free: 0,
  gold: 5,
  platinum: 8,
  diamond: 15,
  lifetime: 15,
};

const TOTAL_PICKS = 15;
const QUOTE_REFRESH_MS = 5 * 60 * 1000; // refresh prices every 5 minutes

interface Pick {
  symbol: string;
  category: string;
  reason: string;
}

interface EnrichedPick extends Pick {
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  marketCap: number | null;
  pe: number | null;
  weekHigh52: number | null;
  weekLow52: number | null;
}

// Server-side quote cache shared across requests on a warm instance
let cache: {
  enriched: EnrichedPick[];
  enrichedAt: number;
} | null = null;

// ============================================================================
// MANUAL STOCK PICKS — edit this list to change the picks, then deploy.
// Order matters: index 0 is pick #1. Gold sees the first 5, Platinum the
// first 8, Diamond all 15. Keep exactly TOTAL_PICKS entries.
// ============================================================================
const MANUAL_PICKS: Pick[] = [
  { symbol: "FLG", category: "Regional Banking", reason: "Flagstar turnaround: cleaner balance sheet and a path back to profitability" },
  { symbol: "CVS", category: "Healthcare", reason: "Integrated healthcare value play with Aetna and Caremark at a cheap multiple" },
  { symbol: "CLF", category: "Steel & Materials", reason: "Leading US steelmaker leveraged to domestic demand and tariff protection" },
  { symbol: "FOUR", category: "Payments", reason: "Fast-growing integrated payments platform expanding internationally" },
  { symbol: "DUOL", category: "EdTech", reason: "Strong user growth with AI-driven subscription monetization" },
  { symbol: "OXLC", category: "Income & CLO Fund", reason: "Double-digit distribution yield from CLO equity exposure" },
  { symbol: "FFTY", category: "Growth ETF", reason: "Basket of top-rated growth and momentum leaders (IBD 50)" },
  { symbol: "KSS", category: "Retail Value", reason: "Deep-value retail turnaround backed by real estate assets" },
  { symbol: "OMF", category: "Consumer Finance", reason: "High dividend yield with resilient consumer lending margins" },
  { symbol: "PYPL", category: "Payments", reason: "Turnaround momentum, Venmo monetization and aggressive buybacks" },
  { symbol: "MCFT", category: "Consumer Leisure", reason: "Premium boat maker with recovery upside as rates ease" },
  { symbol: "ASO", category: "Sporting Goods", reason: "Value sporting-goods retailer with store expansion and buybacks" },
  { symbol: "CF", category: "Agriculture", reason: "Nitrogen fertilizer cash-flow machine with clean ammonia optionality" },
  { symbol: "GRBK", category: "Homebuilders", reason: "High-margin homebuilder in supply-constrained Sun Belt markets" },
  { symbol: "BCC", category: "Building Products", reason: "Wood products and distribution leader tied to housing construction demand" },
];

// Resolve the user's tier from the database (same logic as
// /api/subscription/status). This is the trusted source of truth — we do not
// rely on anything the client sends beyond the user id.
async function resolveTier(userId: number): Promise<string> {
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
  const hasRevenueCatSubscription = user.subscriptionExpiry
    ? new Date(user.subscriptionExpiry) > now && user.subscriptionStatus === "active"
    : false;
  const hasReferralPremium = user.referralPremiumExpiry
    ? new Date(user.referralPremiumExpiry) > now
    : false;

  if ((hasRevenueCatSubscription || hasReferralPremium) && user.subscriptionTier) {
    return user.subscriptionTier.toLowerCase();
  }
  return "free";
}

async function enrichWithQuotes(picks: Pick[]): Promise<EnrichedPick[]> {
  let quotes: any[] = [];
  try {
    const symbols = picks.map((p) => p.symbol).join(",");
    const res = await fetch(`${FMP_BASE_URL}/quote/${symbols}?apikey=${FMP_API_KEY}`);
    const data = await res.json();
    if (Array.isArray(data)) quotes = data;
  } catch {
    // Leave quotes empty; picks still return with null price data.
  }

  return picks.map((pick) => {
    const q = quotes.find((x) => x.symbol === pick.symbol);
    return {
      ...pick,
      name: q?.name || pick.symbol,
      price: q?.price ?? null,
      change: q?.change ?? null,
      changePercent: q?.changesPercentage ?? null,
      marketCap: q?.marketCap ?? null,
      pe: q?.pe ?? null,
      weekHigh52: q?.yearHigh ?? null,
      weekLow52: q?.yearLow ?? null,
    };
  });
}

async function getEnrichedPicks(): Promise<EnrichedPick[]> {
  const now = Date.now();

  if (!cache || now - cache.enrichedAt > QUOTE_REFRESH_MS) {
    cache = { enriched: await enrichWithQuotes(MANUAL_PICKS), enrichedAt: now };
  }

  return cache.enriched;
}

// GET /api/stock-picks - returns the curated stock picks limited to the caller's tier.
// Requires an authenticated user id via the `x-user-id` header.
export async function GET(req: NextRequest) {
  const userIdRaw = req.headers.get("x-user-id");
  const userId = userIdRaw ? parseInt(userIdRaw, 10) : NaN;

  if (!userIdRaw || isNaN(userId)) {
    return NextResponse.json({ error: "User ID required" }, { status: 401 });
  }

  try {
    const tier = await resolveTier(userId);
    const limit = PICKS_BY_TIER[tier] ?? 0;

    // Non-premium users get nothing — names are never sent to the client.
    if (limit <= 0) {
      return NextResponse.json(
        { tier, limit: 0, total: TOTAL_PICKS, picks: [] },
        { status: 403 }
      );
    }

    const enriched = await getEnrichedPicks();

    // Only serialize the picks this tier is entitled to. Higher-tier picks
    // never leave the server, so they can't be read by inspecting the response.
    const picks = enriched.slice(0, limit).map((p, idx) => ({ rank: idx + 1, ...p }));

    return NextResponse.json(
      { tier, limit, total: TOTAL_PICKS, picks },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("stock-picks error:", err);
    return NextResponse.json({ error: "Failed to load stock picks" }, { status: 500 });
  }
}
