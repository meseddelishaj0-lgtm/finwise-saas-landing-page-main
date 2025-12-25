import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/referrals/validate?code=XXXX - Validate a referral code
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        { valid: false, error: "Code is required" },
        { status: 400 }
      );
    }

    const upperCode = code.toUpperCase();

    // Find the user who owns this code
    const codeOwner = await prisma.user.findFirst({
      where: { referralCode: upperCode },
      select: {
        id: true,
        name: true,
        username: true,
        profileImage: true,
      },
    });

    if (codeOwner) {
      return NextResponse.json({
        valid: true,
        referrer: {
          id: codeOwner.id,
          name: codeOwner.name || codeOwner.username || 'User',
          profileImage: codeOwner.profileImage,
        },
      });
    } else {
      return NextResponse.json({ valid: false });
    }
  } catch (error) {
    console.error("Error validating referral code:", error);
    return NextResponse.json(
      { valid: false, error: "Failed to validate code" },
      { status: 500 }
    );
  }
}
