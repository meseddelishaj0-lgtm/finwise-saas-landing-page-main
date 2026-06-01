import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
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
const AI_REFRESH_MS = 24 * 60 * 60 * 1000; // regenerate AI picks once a day
const QUOTE_REFRESH_MS = 5 * 60 * 1000; // refresh prices every 5 minutes

interface AIPick {
  symbol: string;
  category: string;
  reason: string;
}

interface EnrichedPick extends AIPick {
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  marketCap: number | null;
  pe: number | null;
  weekHigh52: number | null;
  weekLow52: number | null;
}

// Server-side cache shared across requests on a warm instance. Picks are the
// same for everyone (we only vary how many we return per tier), so this keeps
// OpenAI/FMP usage to roughly one generation per day + price refreshes.
let cache: {
  aiPicks: AIPick[];
  aiAt: number;
  enriched: EnrichedPick[];
  enrichedAt: number;
} | null = null;

const FALLBACK_PICKS: AIPick[] = [
  { symbol: "NVDA", category: "AI & Tech", reason: "AI chip leader with strong earnings growth" },
  { symbol: "AAPL", category: "Tech Giant", reason: "Services revenue expansion & loyal ecosystem" },
  { symbol: "MSFT", category: "Cloud & AI", reason: "Azure growth and AI integration" },
  { symbol: "GOOGL", category: "AI & Ads", reason: "Search dominance and Gemini AI rollout" },
  { symbol: "AMZN", category: "E-commerce & Cloud", reason: "AWS leader with retail recovery" },
  { symbol: "META", category: "Social & AI", reason: "Reels monetization and AI investments" },
  { symbol: "TSLA", category: "EV & Energy", reason: "FSD progress and energy storage growth" },
  { symbol: "LLY", category: "Healthcare", reason: "GLP-1 drug dominance (Mounjaro/Zepbound)" },
  { symbol: "AVGO", category: "Semiconductors", reason: "AI networking chips and VMware synergies" },
  { symbol: "JPM", category: "Financials", reason: "Best-in-class bank with strong NII" },
  { symbol: "V", category: "Payments", reason: "Cross-border travel recovery" },
  { symbol: "UNH", category: "Healthcare", reason: "Optum growth and aging demographics" },
  { symbol: "XOM", category: "Energy", reason: "Strong cash flow and Permian expansion" },
  { symbol: "COST", category: "Retail", reason: "Membership loyalty and market share gains" },
  { symbol: "HD", category: "Retail", reason: "Pro segment growth and housing demand" },
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

async function generateAIStockPicks(): Promise<AIPick[]> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 2000,
      messages: [
        {
          role: "system",
          content: `You are an expert stock analyst. Generate a list of ${TOTAL_PICKS} top stock picks for investors.
Focus on stocks with strong fundamentals, growth potential, and current market momentum.
Consider various sectors for diversification: Technology, Healthcare, Financials, Consumer, Energy, etc.
Only include US-listed stocks with valid ticker symbols.`,
        },
        {
          role: "user",
          content: `Generate ${TOTAL_PICKS} top stock picks for today. For each stock provide:
1. The ticker symbol (must be a valid US stock ticker)
2. A short category (2-3 words like "AI & Tech", "Healthcare", "Financials")
3. A brief reason for the pick (1 sentence explaining why it's a good investment right now)

Return ONLY a valid JSON array with no markdown formatting, like this:
[{"symbol":"AAPL","category":"Tech Giant","reason":"Strong services growth and loyal customer ecosystem"},...]`,
        },
      ],
    });

    let content = completion.choices[0]?.message?.content?.trim() || "";
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    const start = content.indexOf("[");
    const end = content.lastIndexOf("]");
    if (start !== -1 && end !== -1) {
      content = content.slice(start, end + 1);
    }
    const picks = JSON.parse(content);
    if (Array.isArray(picks) && picks.length > 0) {
      return picks
        .filter((p) => p && typeof p.symbol === "string")
        .slice(0, TOTAL_PICKS)
        .map((p) => ({
          symbol: String(p.symbol).toUpperCase(),
          category: String(p.category || ""),
          reason: String(p.reason || ""),
        }));
    }
    throw new Error("Invalid AI response");
  } catch {
    return FALLBACK_PICKS;
  }
}

async function enrichWithQuotes(picks: AIPick[]): Promise<EnrichedPick[]> {
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

  if (!cache || now - cache.aiAt > AI_REFRESH_MS) {
    const aiPicks = await generateAIStockPicks();
    const enriched = await enrichWithQuotes(aiPicks);
    cache = { aiPicks, aiAt: now, enriched, enrichedAt: now };
    return enriched;
  }

  if (now - cache.enrichedAt > QUOTE_REFRESH_MS) {
    cache.enriched = await enrichWithQuotes(cache.aiPicks);
    cache.enrichedAt = now;
  }

  return cache.enriched;
}

// GET /api/stock-picks - returns AI stock picks limited to the caller's tier.
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
