// POST /api/notifications/clear-all — delete ALL of the caller's notifications
// (same auth pattern as read-all).
import { NextRequest, NextResponse } from "next/server";
import { resolveMobileUserId } from '@/lib/mobileAuth';
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    const _auth = resolveMobileUserId(req, userId);
    if (!_auth.ok) return NextResponse.json({ error: _auth.error }, { status: _auth.status });

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 401 });
    }

    const result = await prisma.notification.deleteMany({
      where: { userId: _auth.userId },
    });

    return NextResponse.json(
      { success: true, deleted: result.count },
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Error clearing notifications:", err);
    return NextResponse.json({ error: "Failed to clear notifications" }, { status: 500 });
  }
}
