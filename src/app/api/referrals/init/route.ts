import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Generate a referral code for a user
function generateReferralCode(userId: number, userName: string): string {
  const cleanName = (userName || 'USER').replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4) || 'USER';
  const userIdSuffix = userId.toString().slice(-4).padStart(4, '0');
  const year = new Date().getFullYear();
  return `${cleanName}${userIdSuffix}${year}`;
}

// POST /api/referrals/init - Initialize referral code for a user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, referralCode: existingCode } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const userIdNum = parseInt(userId);

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userIdNum },
      select: {
        id: true,
        name: true,
        username: true,
        referralCode: true,
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

    // If user already has a code, return it
    if (user.referralCode) {
      return NextResponse.json({
        success: true,
        referralCode: user.referralCode,
        premiumDays: user.referralPremiumDays,
        premiumExpiry: user.referralPremiumExpiry?.toISOString() || null,
      });
    }

    // Generate new code
    const newCode = generateReferralCode(user.id, user.name || user.username || '');

    // Save to database
    await prisma.user.update({
      where: { id: userIdNum },
      data: { referralCode: newCode },
    });

    return NextResponse.json({
      success: true,
      referralCode: newCode,
      premiumDays: 0,
      premiumExpiry: null,
    });
  } catch (error) {
    console.error("Error initializing referral:", error);
    return NextResponse.json(
      { error: "Failed to initialize referral" },
      { status: 500 }
    );
  }
}
