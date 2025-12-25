// api/user/by-username/route.ts
// Get user by username or search users
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// GET /api/user/by-username?username=testuser (exact match)
// GET /api/user/by-username?query=test&userId=123 (search by name/username)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");
    const query = searchParams.get("query");
    const userId = searchParams.get("userId");

    // If exact username lookup
    if (username) {
      const user = await prisma.user.findFirst({
        where: {
          username: {
            equals: username,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          bio: true,
          profileImage: true,
          karma: true,
          isVerified: true,
          createdAt: true,
          _count: {
            select: {
              posts: true,
              followers: true,
              following: true,
            },
          },
        },
      });

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      return NextResponse.json(user);
    }

    // If search query provided
    if (query) {
      const currentUserId = userId ? parseInt(userId) : null;

      // Get blocked users if current user is provided
      let blockedUserIds: number[] = [];
      if (currentUserId) {
        const blocks = await prisma.block.findMany({
          where: {
            OR: [
              { blockerId: currentUserId },
              { blockedId: currentUserId },
            ],
          },
          select: { blockerId: true, blockedId: true },
        });
        blockedUserIds = blocks.flatMap(b => [b.blockerId, b.blockedId]);
      }

      const users = await prisma.user.findMany({
        where: {
          AND: [
            {
              OR: [
                { username: { contains: query, mode: 'insensitive' } },
                { name: { contains: query, mode: 'insensitive' } },
              ],
            },
            currentUserId ? { id: { not: currentUserId } } : {},
            blockedUserIds.length > 0 ? { id: { notIn: blockedUserIds } } : {},
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          profileImage: true,
          isVerified: true,
          _count: {
            select: {
              posts: true,
              followers: true,
            },
          },
        },
        take: 20,
        orderBy: [
          { followers: { _count: 'desc' } },
          { name: 'asc' },
        ],
      });

      return NextResponse.json({ users });
    }

    return NextResponse.json({ error: "username or query is required" }, { status: 400 });
  } catch (error) {
    console.error("Error fetching user by username:", error);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}
