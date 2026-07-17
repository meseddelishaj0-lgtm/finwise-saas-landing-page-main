import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { resolveMobileUserId } from "@/lib/mobileAuth";

export const dynamic = 'force-dynamic';

// GET /api/notifications?userId=123 - Get notifications
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const unread = searchParams.get("unread");

    // Notifications are private — verify the caller owns the requested id so a
    // spoofed ?userId can't read another user's notifications.
    const auth = resolveMobileUserId(req, searchParams.get("userId"));
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId }
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
        fromUser: { select: { id: true, name: true, username: true, profileImage: true } },
        post: { select: { id: true, title: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    const response = NextResponse.json(notifications, { status: 200 });
    // Cache for 10 seconds with stale-while-revalidate for faster subsequent loads
    response.headers.set('Cache-Control', 'private, s-maxage=10, stale-while-revalidate=30');
    return response;
  } catch (err) {
    console.error("❌ Error fetching notifications:", err);
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 });
  }
}
