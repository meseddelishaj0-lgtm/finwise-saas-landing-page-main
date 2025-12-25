import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/messages/[conversationId] - Get messages in a conversation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const userId = request.headers.get("x-user-id");
    const { conversationId } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID required" },
        { status: 401 }
      );
    }

    const userIdNum = parseInt(userId);
    const conversationIdNum = parseInt(conversationId);

    // Verify user is part of this conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationIdNum },
      include: {
        user1: {
          select: {
            id: true,
            username: true,
            name: true,
            profileImage: true,
            isVerified: true,
          },
        },
        user2: {
          select: {
            id: true,
            username: true,
            name: true,
            profileImage: true,
            isVerified: true,
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    if (conversation.participant1 !== userIdNum && conversation.participant2 !== userIdNum) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Get pagination params
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const before = url.searchParams.get("before"); // cursor for pagination

    // Get messages
    const messages = await prisma.message.findMany({
      where: {
        conversationId: conversationIdNum,
        ...(before && { id: { lt: parseInt(before) } }),
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            name: true,
            profileImage: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Mark messages as read
    await prisma.message.updateMany({
      where: {
        conversationId: conversationIdNum,
        senderId: { not: userIdNum },
        isRead: false,
      },
      data: { isRead: true },
    });

    const otherUser = conversation.participant1 === userIdNum
      ? conversation.user2
      : conversation.user1;

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        otherUser,
      },
      messages: messages.reverse().map((msg) => ({
        id: msg.id,
        content: msg.content,
        createdAt: msg.createdAt.toISOString(),
        senderId: msg.senderId,
        sender: msg.sender,
        isRead: msg.isRead,
        isFromMe: msg.senderId === userIdNum,
      })),
      hasMore: messages.length === limit,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

// POST /api/messages/[conversationId] - Send a message in a conversation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const userId = request.headers.get("x-user-id");
    const { conversationId } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID required" },
        { status: 401 }
      );
    }

    const userIdNum = parseInt(userId);
    const conversationIdNum = parseInt(conversationId);
    const body = await request.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }

    // Verify user is part of this conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationIdNum },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    if (conversation.participant1 !== userIdNum && conversation.participant2 !== userIdNum) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Check if blocked
    const otherUserId = conversation.participant1 === userIdNum
      ? conversation.participant2
      : conversation.participant1;

    const isBlocked = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: otherUserId, blockedId: userIdNum },
          { blockerId: userIdNum, blockedId: otherUserId },
        ],
      },
    });

    if (isBlocked) {
      return NextResponse.json(
        { error: "Cannot send message to this user" },
        { status: 403 }
      );
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        conversationId: conversationIdNum,
        senderId: userIdNum,
        content: content.trim(),
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            name: true,
            profileImage: true,
          },
        },
      },
    });

    // Update conversation's lastMessageAt
    await prisma.conversation.update({
      where: { id: conversationIdNum },
      data: { lastMessageAt: new Date() },
    });

    return NextResponse.json({
      message: {
        id: message.id,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
        senderId: message.senderId,
        sender: message.sender,
        isRead: message.isRead,
        isFromMe: true,
      },
    });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
