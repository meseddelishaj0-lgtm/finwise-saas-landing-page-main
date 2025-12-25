import { NextRequest, NextResponse } from "next/server";
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

      // Update referrer's premium status with appropriate tier
      await prisma.user.update({
        where: { id: referrer.id },
        data: {
          referralPremiumDays: totalDays,
          referralPremiumExpiry: newExpiry,
          // Tier based on referral count: 5-14=Gold, 15-29=Platinum, 30+=Diamond
          subscriptionTier: referralTier,
          subscriptionExpiry: newExpiry,
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
