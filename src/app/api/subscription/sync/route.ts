// api/subscription/sync/route.ts
// Sync subscription tier from mobile app after purchase
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// POST /api/subscription/sync - Sync subscription tier to database
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, tier, productId, expirationDate } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const userIdNum = parseInt(userId.toString(), 10);
    if (isNaN(userIdNum)) {
      return NextResponse.json(
        { error: "Invalid userId" },
        { status: 400 }
      );
    }

    // Validate tier
    const validTiers = ['free', 'gold', 'platinum', 'diamond'];
    const normalizedTier = tier?.toLowerCase() || 'free';

    if (!validTiers.includes(normalizedTier)) {
      return NextResponse.json(
        { error: "Invalid tier. Must be: free, gold, platinum, or diamond" },
        { status: 400 }
      );
    }

    // Update user's subscription tier
    const updatedUser = await prisma.user.update({
      where: { id: userIdNum },
      data: {
        subscriptionTier: normalizedTier,
        subscriptionStatus: normalizedTier !== 'free' ? 'active' : null,
        subscriptionProductId: productId || null,
        subscriptionExpiry: expirationDate ? new Date(expirationDate) : null,
      },
      select: {
        id: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        subscriptionExpiry: true,
      },
    });

    console.log(`✅ Subscription synced for user ${userIdNum}: ${normalizedTier}`);

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error syncing subscription:", error);
    return NextResponse.json(
      { error: "Failed to sync subscription" },
      { status: 500 }
    );
  }
}
