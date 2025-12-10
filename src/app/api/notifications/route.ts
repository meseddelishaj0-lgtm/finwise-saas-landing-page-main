import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// GET /api/notifications?userId=123 - Get notifications
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const unread = searchParams.get("unread");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const notifications = await prisma.notification.findMany({
      where: {
        userId: user.id,
        ...(unread === "true" ? { isRead: false } : {})
      },
      include: {
        fromUser: { select: { id: true, name: true, email: true, username: true, profileImage: true } },
        post: { select: { id: true, title: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    return NextResponse.json(notifications, { status: 200 });
  } catch (err) {
    console.error("❌ Error fetching notifications:", err);
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 });
  }
}
