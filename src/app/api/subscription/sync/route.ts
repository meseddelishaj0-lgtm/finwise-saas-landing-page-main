// api/subscription/sync/route.ts
// Sync subscription tier from mobile app after purchase
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { syncDiamondVerification } from '@/lib/verification';
import { getVerifiedSubscription } from '@/lib/verifySubscription';

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

    // SECURE PATH — only when server-side RevenueCat verification is configured
    // (REVENUECAT_API_KEY present). The client's claimed tier is ignored; we
    // write only what RevenueCat confirms this user owns. A null result means
    // "unverified" (no active entitlement, or a transient lookup failure): we
    // preserve the stored tier rather than downgrade, and an unverified claim
    // never elevates. This is what closes the free-tier bypass.
    if (process.env.REVENUECAT_API_KEY) {
      const verified = await getVerifiedSubscription(userIdNum);
      if (!verified) {
        const current = await prisma.user.findUnique({
          where: { id: userIdNum },
          select: { id: true, subscriptionTier: true, subscriptionStatus: true, subscriptionExpiry: true },
        });
        return NextResponse.json({ success: true, verified: false, user: current });
      }
      const updatedUser = await prisma.user.update({
        where: { id: userIdNum },
        data: {
          subscriptionTier: verified.subscriptionTier,
          subscriptionStatus: verified.subscriptionStatus,
          subscriptionProductId: verified.subscriptionProductId,
          subscriptionExpiry: verified.subscriptionExpiry,
        },
        select: { id: true, subscriptionTier: true, subscriptionStatus: true, subscriptionExpiry: true },
      });
      await syncDiamondVerification(userIdNum, verified.subscriptionTier);
      return NextResponse.json({ success: true, verified: true, user: updatedUser });
    }

    // LEGACY PATH — REVENUECAT_API_KEY is not configured, so we cannot verify
    // server-side. Fall back to the previous client-trusted behavior so paid
    // users keep syncing (setting the env var flips this to the secure path with
    // no code change). NOTE: this path is spoofable — set REVENUECAT_API_KEY to
    // close it.
    const validTiers = ['free', 'gold', 'platinum', 'diamond'];
    const normalizedTier = tier?.toLowerCase() || 'free';
    if (!validTiers.includes(normalizedTier)) {
      return NextResponse.json(
        { error: "Invalid tier. Must be: free, gold, platinum, or diamond" },
        { status: 400 }
      );
    }
    const updatedUser = await prisma.user.update({
      where: { id: userIdNum },
      data: {
        subscriptionTier: normalizedTier,
        subscriptionStatus: normalizedTier !== 'free' ? 'active' : null,
        subscriptionProductId: productId || null,
        subscriptionExpiry: expirationDate ? new Date(expirationDate) : null,
      },
      select: { id: true, subscriptionTier: true, subscriptionStatus: true, subscriptionExpiry: true },
    });
    await syncDiamondVerification(userIdNum, normalizedTier);
    return NextResponse.json({ success: true, verified: false, user: updatedUser });
  } catch (error) {
    console.error("Error syncing subscription:", error);
    return NextResponse.json(
      { error: "Failed to sync subscription" },
      { status: 500 }
    );
  }
}
