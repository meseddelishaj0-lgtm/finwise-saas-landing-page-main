import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from '@/lib/rateLimit';
import prisma from "@/lib/prisma";

// Reward tiers with subscription tier levels
const REWARD_TIERS = [
  { referrals: 5, reward: '1 Week Gold', days: 7, tier: 'gold' },
  { referrals: 10, reward: '1 Month Gold', days: 30, tier: 'gold' },
  { referrals: 15, reward: '2 Months Platinum', days: 60, tier: 'platinum' },
  { referrals: 20, reward: '3 Months Platinum', days: 90, tier: 'platinum' },
  { referrals: 30, reward: '6 Months Diamond', days: 180, tier: 'diamond' },
  { referrals: 50, reward: '1 Year Diamond', days: 365, tier: 'diamond' },
];

function calculatePremiumDays(completedReferrals: number): number {
  let totalDays = 0;
  for (const tier of REWARD_TIERS) {
    if (completedReferrals >= tier.referrals) {
      totalDays = tier.days;
    }
  }
  return totalDays;
}

const TIER_RANK: Record<string, number> = { free: 0, gold: 1, platinum: 2, diamond: 3 };

function calculateReferralTier(completedReferrals: number): string {
  let tier = 'free';
  for (const rewardTier of REWARD_TIERS) {
    if (completedReferrals >= rewardTier.referrals) {
      tier = rewardTier.tier;
    }
  }
  return tier;
}

// POST /api/referrals/complete - Complete a referral (mark as done)
export async function POST(request: NextRequest) {
  const _rl = enforceRateLimit(request, 'referral', 10, 60_000);
  if (_rl) return _rl;
  try {
    const body = await request.json();
    const { referralCode } = body;

    if (!referralCode) {
      return NextResponse.json(
        { error: "Referral code is required" },
        { status: 400 }
      );
    }

    const upperCode = referralCode.toUpperCase();

    // Find the referrer (owner of the code)
    const referrer = await prisma.user.findFirst({
      where: { referralCode: upperCode },
      select: {
        id: true,
        name: true,
        username: true,
        referralPremiumDays: true,
        referralPremiumExpiry: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        subscriptionExpiry: true,
      },
    });

    if (!referrer) {
      return NextResponse.json(
        { error: "Invalid referral code" },
        { status: 400 }
      );
    }

    // Count completed referrals for this referrer
    const completedCount = await prisma.referral.count({
      where: {
        referrerId: referrer.id,
        status: { in: ['completed', 'rewarded'] },
      },
    });

    const totalDays = calculatePremiumDays(completedCount);
    const referralTier = calculateReferralTier(completedCount);

    if (totalDays > 0) {
      // Calculate new expiry date
      const now = new Date();
      const currentExpiry = referrer.referralPremiumExpiry
        ? new Date(referrer.referralPremiumExpiry)
        : now;

      const startDate = currentExpiry > now ? currentExpiry : now;
      const newExpiry = new Date(startDate);
      newExpiry.setDate(newExpiry.getDate() + totalDays);

      // Never let a referral reward DOWNGRADE or SHORTEN an existing (e.g. paid)
      // subscription — a paying Diamond user with 5 referrals must not drop to
      // Gold. Take the higher tier and the later expiry.
      const curTier = (referrer.subscriptionTier || 'free').toLowerCase();
      const curExpiry = referrer.subscriptionExpiry ? new Date(referrer.subscriptionExpiry) : null;
      const curActive = referrer.subscriptionStatus === 'active' && !!curExpiry && curExpiry > now;
      const bestTier = (TIER_RANK[referralTier] ?? 0) >= (TIER_RANK[curTier] ?? 0) ? referralTier : curTier;
      const bestExpiry = curActive && curExpiry! > newExpiry ? curExpiry! : newExpiry;

      await prisma.user.update({
        where: { id: referrer.id },
        data: {
          referralPremiumDays: totalDays,
          referralPremiumExpiry: newExpiry,
          subscriptionTier: bestTier,
          subscriptionExpiry: bestExpiry,
          subscriptionStatus: 'active',
        },
      });

      // Mark referrals as rewarded
      await prisma.referral.updateMany({
        where: {
          referrerId: referrer.id,
          status: 'completed',
        },
        data: {
          status: 'rewarded',
          rewardDays: totalDays,
          rewardedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      referrerId: referrer.id,
      completedReferrals: completedCount,
      totalDaysEarned: totalDays,
    });
  } catch (error) {
    console.error("Error completing referral:", error);
    return NextResponse.json(
      { error: "Failed to complete referral" },
      { status: 500 }
    );
  }
}
