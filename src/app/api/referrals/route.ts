import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Reward tiers - same as in the app
// Higher referral counts unlock higher subscription tiers
const REWARD_TIERS = [
  { referrals: 5, reward: '1 Week Gold', days: 7, tier: 'gold' },
  { referrals: 10, reward: '1 Month Gold', days: 30, tier: 'gold' },
  { referrals: 15, reward: '2 Months Platinum', days: 60, tier: 'platinum' },
  { referrals: 20, reward: '3 Months Platinum', days: 90, tier: 'platinum' },
  { referrals: 30, reward: '6 Months Diamond', days: 180, tier: 'diamond' },
  { referrals: 50, reward: '1 Year Diamond', days: 365, tier: 'diamond' },
];

// Calculate premium days based on completed referrals
function calculatePremiumDays(completedReferrals: number): number {
  let totalDays = 0;
  for (const tier of REWARD_TIERS) {
    if (completedReferrals >= tier.referrals) {
      totalDays = tier.days;
    }
  }
  return totalDays;
}

// Calculate subscription tier based on completed referrals
function calculateReferralTier(completedReferrals: number): string {
  let tier = 'free';
  for (const rewardTier of REWARD_TIERS) {
    if (completedReferrals >= rewardTier.referrals) {
      tier = rewardTier.tier;
    }
  }
  return tier;
}

// Generate a referral code for a user
function generateReferralCode(userId: number, userName: string): string {
  const cleanName = (userName || 'USER').replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4) || 'USER';
  const userIdSuffix = userId.toString().slice(-4).padStart(4, '0');
  const year = new Date().getFullYear();
  return `${cleanName}${userIdSuffix}${year}`;
}

// GET /api/referrals - Get user's referral data
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const url = new URL(request.url);
    const code = url.searchParams.get("code");

    // If code is provided, validate it (for checking someone else's code)
    if (code) {
      const upperCode = code.toUpperCase();
      const codeOwner = await prisma.user.findFirst({
        where: { referralCode: upperCode },
        select: { id: true, name: true, username: true },
      });

      if (codeOwner) {
        return NextResponse.json({
          valid: true,
          referrer: {
            id: codeOwner.id,
            name: codeOwner.name || codeOwner.username
          }
        });
      } else {
        return NextResponse.json({ valid: false });
      }
    }

    // If no code, get the user's referral data
    if (!userId) {
      return NextResponse.json(
        { error: "User ID required" },
        { status: 401 }
      );
    }

    const userIdNum = parseInt(userId);

    // Get user with their referral code and referrals
    const user = await prisma.user.findUnique({
      where: { id: userIdNum },
      select: {
        id: true,
        name: true,
        username: true,
        referralCode: true,
        referralPremiumDays: true,
        referralPremiumExpiry: true,
        referredBy: true,
        referralsMade: {
          include: {
            referredUser: {
              select: {
                id: true,
                name: true,
                username: true,
                profileImage: true,
                createdAt: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Generate referral code if user doesn't have one
    let referralCode = user.referralCode;
    if (!referralCode) {
      referralCode = generateReferralCode(user.id, user.name || user.username || '');
      await prisma.user.update({
        where: { id: userIdNum },
        data: { referralCode },
      });
    }

    // Calculate stats
    const completedReferrals = user.referralsMade.filter(r => r.status === 'completed' || r.status === 'rewarded').length;
    const pendingReferrals = user.referralsMade.filter(r => r.status === 'pending').length;
    const totalDaysEarned = calculatePremiumDays(completedReferrals);

    // Check if premium from referrals is active
    const isPremiumFromReferrals = user.referralPremiumExpiry
      ? new Date(user.referralPremiumExpiry) > new Date()
      : false;

    // Find next reward tier
    let nextTier = null;
    for (const tier of REWARD_TIERS) {
      if (completedReferrals < tier.referrals) {
        nextTier = tier;
        break;
      }
    }

    return NextResponse.json({
      referralCode,
      stats: {
        completedReferrals,
        pendingReferrals,
        totalDaysEarned,
        isPremiumFromReferrals,
        premiumExpiry: user.referralPremiumExpiry?.toISOString() || null,
      },
      nextTier: nextTier ? {
        referralsNeeded: nextTier.referrals - completedReferrals,
        reward: nextTier.reward,
        days: nextTier.days,
      } : null,
      referrals: user.referralsMade.map(r => ({
        id: r.id,
        status: r.status,
        rewardDays: r.rewardDays,
        createdAt: r.createdAt.toISOString(),
        completedAt: r.completedAt?.toISOString() || null,
        referredUser: {
          id: r.referredUser.id,
          name: r.referredUser.name || r.referredUser.username,
          profileImage: r.referredUser.profileImage,
          joinedAt: r.referredUser.createdAt.toISOString(),
        },
      })),
      rewardTiers: REWARD_TIERS,
    });
  } catch (error) {
    console.error("Error fetching referral data:", error);
    return NextResponse.json(
      { error: "Failed to fetch referral data" },
      { status: 500 }
    );
  }
}

// POST /api/referrals - Apply a referral code (for the person being referred)
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID required" },
        { status: 401 }
      );
    }

    const userIdNum = parseInt(userId);
    const body = await request.json();
    const { referralCode, action } = body;

    // Handle different actions
    if (action === 'init') {
      // Initialize/generate referral code for user
      const user = await prisma.user.findUnique({
        where: { id: userIdNum },
        select: { id: true, name: true, username: true, referralCode: true },
      });

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      if (user.referralCode) {
        return NextResponse.json({ referralCode: user.referralCode });
      }

      const newCode = generateReferralCode(user.id, user.name || user.username || '');
      await prisma.user.update({
        where: { id: userIdNum },
        data: { referralCode: newCode },
      });

      return NextResponse.json({ referralCode: newCode });
    }

    // Apply a referral code
    if (!referralCode) {
      return NextResponse.json(
        { error: "Referral code is required" },
        { status: 400 }
      );
    }

    const upperCode = referralCode.toUpperCase();

    // Get the current user
    const currentUser = await prisma.user.findUnique({
      where: { id: userIdNum },
      select: { id: true, referredBy: true, referralCode: true, createdAt: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user already used a referral code
    if (currentUser.referredBy) {
      return NextResponse.json(
        { error: "You have already used a referral code" },
        { status: 400 }
      );
    }

    // Check if user is trying to use their own code
    if (currentUser.referralCode === upperCode) {
      return NextResponse.json(
        { error: "You cannot use your own referral code" },
        { status: 400 }
      );
    }

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

    // Check if this referral already exists
    const existingReferral = await prisma.referral.findUnique({
      where: {
        referrerId_referredUserId: {
          referrerId: referrer.id,
          referredUserId: userIdNum,
        },
      },
    });

    if (existingReferral) {
      return NextResponse.json(
        { error: "This referral has already been recorded" },
        { status: 400 }
      );
    }

    // Create the referral record
    await prisma.referral.create({
      data: {
        referrerId: referrer.id,
        referredUserId: userIdNum,
        referralCode: upperCode,
        status: 'completed',
        completedAt: new Date(),
      },
    });

    // Update current user to mark they were referred
    await prisma.user.update({
      where: { id: userIdNum },
      data: { referredBy: referrer.id },
    });

    // Count referrer's completed referrals and update their premium
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

      // If current expiry is in the past, start from now
      const startDate = currentExpiry > now ? currentExpiry : now;
      const newExpiry = new Date(startDate);
      newExpiry.setDate(newExpiry.getDate() + totalDays);

      // Update referrer's premium status with the appropriate tier
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

      // Mark the referral as rewarded
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

    // Give the referred user (person who entered the code) 7 days free premium
    const referredUserExpiry = new Date();
    referredUserExpiry.setDate(referredUserExpiry.getDate() + 7);

    await prisma.user.update({
      where: { id: userIdNum },
      data: {
        referralPremiumDays: 7,
        referralPremiumExpiry: referredUserExpiry,
        subscriptionTier: 'gold',
        subscriptionExpiry: referredUserExpiry,
        subscriptionStatus: 'active',
      },
    });

    return NextResponse.json({
      success: true,
      message: "Referral code applied successfully!",
      reward: {
        referrerName: referrer.name || referrer.username,
        daysEarned: 7,
        expiresAt: referredUserExpiry.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error applying referral code:", error);
    return NextResponse.json(
      { error: "Failed to apply referral code" },
      { status: 500 }
    );
  }
}
