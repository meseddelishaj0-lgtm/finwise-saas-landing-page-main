import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST /api/notifications/:id/read - Mark notification as read
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 401 });
    }

    const notificationId = parseInt(params.id, 10);

    if (isNaN(notificationId)) {
      return NextResponse.json({ error: "Invalid notification ID" }, { status: 400 });
    }

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId }
    });

    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    if (notification.userId !== userId) {
      return NextResponse.json(
        { error: "Cannot mark other user's notifications" },
        { status: 403 }
      );
    }

    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
      include: {
        fromUser: { select: { id: true, name: true, email: true } },
        post: { select: { id: true, title: true } }
      }
    });

    return NextResponse.json(updatedNotification, { status: 200 });
  } catch (err) {
    console.error("❌ Error marking notification as read:", err);
    return NextResponse.json({ error: "Failed to mark notification as read" }, { status: 500 });
  }
}
