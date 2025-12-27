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

    if (isNaN(userIdNum) || isNaN(conversationIdNum)) {
      return NextResponse.json(
        { error: "Invalid user ID or conversation ID" },
        { status: 400 }
      );
    }

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
    const limitParam = url.searchParams.get("limit");
    const limit = Math.min(Math.max(parseInt(limitParam || "50"), 1), 100);
    const before = url.searchParams.get("before"); // cursor for pagination

    // Validate pagination params
    if (isNaN(limit)) {
      return NextResponse.json(
        { error: "Invalid limit parameter" },
        { status: 400 }
      );
    }

    const beforeNum = before ? parseInt(before) : null;
    if (before && isNaN(beforeNum as number)) {
      return NextResponse.json(
        { error: "Invalid cursor parameter" },
        { status: 400 }
      );
    }

    // Get messages
    const messages = await prisma.message.findMany({
      where: {
        conversationId: conversationIdNum,
        ...(beforeNum && { id: { lt: beforeNum } }),
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
        imageUrl: msg.imageUrl,
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

    if (isNaN(userIdNum) || isNaN(conversationIdNum)) {
      return NextResponse.json(
        { error: "Invalid user ID or conversation ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { content, imageUrl } = body;

    if ((!content || !content.trim()) && !imageUrl) {
      return NextResponse.json(
        { error: "Message content or image is required" },
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
        content: content?.trim() || '',
        imageUrl: imageUrl || null,
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
        imageUrl: message.imageUrl,
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

// DELETE /api/messages/[conversationId] - Delete a message
export async function DELETE(
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
    if (isNaN(userIdNum)) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 400 }
      );
    }

    const url = new URL(request.url);
    const messageId = url.searchParams.get("messageId");

    if (!messageId) {
      return NextResponse.json(
        { error: "Message ID is required" },
        { status: 400 }
      );
    }

    const messageIdNum = parseInt(messageId);
    if (isNaN(messageIdNum)) {
      return NextResponse.json(
        { error: "Invalid message ID" },
        { status: 400 }
      );
    }

    // Find the message and verify ownership
    const message = await prisma.message.findUnique({
      where: { id: messageIdNum },
      include: { conversation: true },
    });

    if (!message) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    // Only the sender can delete their own message
    if (message.senderId !== userIdNum) {
      return NextResponse.json(
        { error: "You can only delete your own messages" },
        { status: 403 }
      );
    }

    // Verify the message belongs to the specified conversation
    if (message.conversationId !== parseInt(conversationId)) {
      return NextResponse.json(
        { error: "Message does not belong to this conversation" },
        { status: 400 }
      );
    }

    // Delete the message
    await prisma.message.delete({
      where: { id: messageIdNum },
    });

    return NextResponse.json({ success: true, deletedMessageId: messageIdNum });
  } catch (error) {
    console.error("Error deleting message:", error);
    return NextResponse.json(
      { error: "Failed to delete message" },
      { status: 500 }
    );
  }
}
