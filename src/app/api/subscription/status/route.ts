import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/subscription/status - Get user's subscription status from database
// This includes referral-based premium rewards
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID required" },
        { status: 401 }
      );
    }

    const userIdNum = parseInt(userId);

    const user = await prisma.user.findUnique({
      where: { id: userIdNum },
      select: {
        id: true,
        subscriptionTier: true,
        subscriptionExpiry: true,
        subscriptionStatus: true,
        subscriptionProductId: true,
        referralPremiumDays: true,
        referralPremiumExpiry: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const now = new Date();

    // Check if subscription from RevenueCat is still active
    const hasRevenueCatSubscription = user.subscriptionExpiry
      ? new Date(user.subscriptionExpiry) > now && user.subscriptionStatus === 'active'
      : false;

    // Check if referral premium is still active
    const hasReferralPremium = user.referralPremiumExpiry
      ? new Date(user.referralPremiumExpiry) > now
      : false;

    // User is premium if they have either type
    const isPremium = hasRevenueCatSubscription || hasReferralPremium;

    // Determine the active tier
    let activeTier = 'free';
    let activeExpiry = null;

    if (hasRevenueCatSubscription && user.subscriptionTier) {
      activeTier = user.subscriptionTier;
      activeExpiry = user.subscriptionExpiry?.toISOString() || null;
    } else if (hasReferralPremium && user.subscriptionTier) {
      // Referral premium tier is stored in subscriptionTier
      // Based on referral count: 5-14=Gold, 15-29=Platinum, 30+=Diamond
      activeTier = user.subscriptionTier;
      activeExpiry = user.referralPremiumExpiry?.toISOString() || null;
    }

    return NextResponse.json({
      isPremium,
      tier: activeTier,
      expiresAt: activeExpiry,
      source: hasRevenueCatSubscription ? 'subscription' : (hasReferralPremium ? 'referral' : null),
      referralPremium: {
        active: hasReferralPremium,
        daysEarned: user.referralPremiumDays,
        expiresAt: user.referralPremiumExpiry?.toISOString() || null,
      },
      subscription: {
        active: hasRevenueCatSubscription,
        tier: user.subscriptionTier,
        status: user.subscriptionStatus,
        productId: user.subscriptionProductId,
        expiresAt: user.subscriptionExpiry?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription status" },
      { status: 500 }
    );
  }
}
