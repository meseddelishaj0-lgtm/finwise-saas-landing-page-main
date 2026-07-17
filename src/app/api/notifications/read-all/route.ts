import { NextRequest, NextResponse } from "next/server";
import { resolveMobileUserId } from '@/lib/mobileAuth';
import prisma from "@/lib/prisma";

// POST /api/notifications/read-all - Mark all notifications as read
export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    const _auth = resolveMobileUserId(req, userId);
    if (!_auth.ok) return NextResponse.json({ error: _auth.error }, { status: _auth.status });

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 401 });
    }

    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userIdNum }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.notification.updateMany({
      where: {
        userId: user.id,
        isRead: false
      },
      data: { isRead: true }
    });

    return NextResponse.json(
      { success: true, message: "All notifications marked as read" },
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Error marking all notifications as read:", err);
    return NextResponse.json({ error: "Failed to mark all notifications as read" }, { status: 500 });
  }
}
