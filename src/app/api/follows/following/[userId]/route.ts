import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/follows/followers/:userId - Get user's followers (PUBLIC)
export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = parseInt(params.userId);

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const followers = await prisma.follow.findMany({
      where: { followingId: userId },
      include: {
        follower: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    const followerUsers = followers.map(f => f.follower);

    return NextResponse.json(followerUsers, { status: 200 });
  } catch (err) {
    console.error("❌ Error fetching followers:", err);
    return NextResponse.json({ error: "Failed to fetch followers" }, { status: 500 });
  }
}
